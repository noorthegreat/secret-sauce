#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_COMPATIBILITY || 5);
const MATCH_LIMIT = Number(process.env.MATCH_LIMIT || 0);
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required environment variables.');
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function buildPairKey(a, b) {
  return [a, b].sort().join('|');
}

function promptForMatch(userName1, userName2, user1Answers, user2Answers, matchType) {
  const systemPrompt = matchType === 'friendship'
    ? "You are a friendship compatibility expert. These two users are already confirmed as a great friendship match by the platform's matching engine. Generate a warm, insightful, encouraging paragraph (2-3 sentences) explaining why they could become great friends. Focus on shared interests, compatible social styles, and what they're both looking for in a friendship. Do NOT mention dating or romance. Keep wording positive, specific, and concise."
    : "You are a dating compatibility expert. These two users are already confirmed as an eligible match by the product's matching engine. Generate a warm, insightful, encouraging paragraph (2-3 sentences) explaining why they may connect. Focus on shared values, complementary traits, and communication style. Do NOT question their eligibility, orientation, or whether they should be matched. Do NOT introduce disqualifying caveats like attraction mismatch or compatibility blockers. Keep wording positive, specific, and concise.";

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Generate a compatibility insight based on these questionnaire answers:\n\nUser 1 (${userName1}):\n${user1Answers}\n\nUser 2 (${userName2}):\n${user2Answers}`,
    },
  ];
}

function formatAnswers(answers, questionsMap, isFriendship) {
  return answers.map((answer) => {
    const lookupKey = isFriendship ? (answer.question_id ?? answer.question_number) : answer.question_number;
    const qData = questionsMap.get(lookupKey);
    const displayAnswer = answer.answer_custom || answer.answer || '';

    if (!qData) {
      return `[Q${lookupKey}] [Unknown Question] [Answer: ${displayAnswer}]`;
    }

    const values = displayAnswer.split(',').map((value) => value.trim()).filter(Boolean);
    const labels = values.map((value) => qData.options.get(value) || value);
    return `[Question: ${qData.question}] [Answer: ${labels.join(', ')}]`;
  }).join('\n');
}

async function fetchMatches() {
  let query = supabase.from('matches').select('user_id,matched_user_id,match_type');
  if (MATCH_LIMIT > 0) query = query.limit(MATCH_LIMIT);
  const { data, error } = await query;
  if (error) throw error;
  if (!Array.isArray(data)) return [];

  const seen = new Set();
  const pairs = [];

  for (const row of data) {
    const userId1 = row.user_id;
    const userId2 = row.matched_user_id;
    if (!userId1 || !userId2 || userId1 === userId2) continue;
    const key = buildPairKey(userId1, userId2);
    if (seen.has(key)) continue;
    seen.add(key);

    const [smallerId, largerId] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    pairs.push({ userId1: smallerId, userId2: largerId, matchType: row.match_type || 'relationship' });
  }

  return pairs;
}

async function fetchUserName(id) {
  const { data, error } = await supabase.from('profiles').select('first_name').eq('id', id).limit(1).maybeSingle();
  if (error) throw error;
  return data?.first_name || 'User';
}

async function fetchAnswersAndQuestions(pair) {
  const isFriendship = pair.matchType === 'friendship';

  if (isFriendship) {
    const [a1, a2, q] = await Promise.all([
      supabase.from('friendship_answers').select('question_number,question_id,answer,answer_custom').eq('user_id', pair.userId1),
      supabase.from('friendship_answers').select('question_number,question_id,answer,answer_custom').eq('user_id', pair.userId2),
      supabase.from('friendship_questions').select('id,question,options'),
    ]);
    return {
      answers1: a1.data || [],
      answers2: a2.data || [],
      questionsData: q.data || [],
    };
  }

  const [a1, a2, q] = await Promise.all([
    supabase.from('personality_answers').select('question_number,answer').eq('user_id', pair.userId1).order('question_number'),
    supabase.from('personality_answers').select('question_number,answer').eq('user_id', pair.userId2).order('question_number'),
    supabase.from('questionnaire_questions').select('id,question,options'),
  ]);
  return {
    answers1: a1.data || [],
    answers2: a2.data || [],
    questionsData: q.data || [],
  };
}

async function generateCompatibility({ userId1, userId2, matchType }) {
  const [name1, name2] = await Promise.all([fetchUserName(userId1), fetchUserName(userId2)]);
  const { answers1, answers2, questionsData } = await fetchAnswersAndQuestions({ userId1, userId2, matchType });

  if (!answers1.length || !answers2.length) {
    console.warn(`Skipping ${userId1} / ${userId2}: missing questionnaire answers.`);
    return null;
  }

  const questionsMap = new Map();
  for (const question of questionsData) {
    const optionsMap = new Map();
    if (Array.isArray(question.options)) {
      for (const option of question.options) {
        if (option?.value != null) {
          optionsMap.set(option.value, option.label ?? String(option.value));
        }
      }
    }
    questionsMap.set(question.id, { question: question.question, options: optionsMap });
  }

  const user1Answers = formatAnswers(answers1, questionsMap, matchType === 'friendship');
  const user2Answers = formatAnswers(answers2, questionsMap, matchType === 'friendship');

  if (!user1Answers || !user2Answers) {
    console.warn(`Skipping ${userId1} / ${userId2}: unable to format answers.`);
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: promptForMatch(name1, name2, user1Answers, user2Answers, matchType),
      max_tokens: 250,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${text}`);
  }

  const payload = await response.json();
  const compatibility = payload?.choices?.[0]?.message?.content?.trim();
  if (!compatibility) {
    throw new Error('OpenAI returned no compatibility text.');
  }

  const [smallerId, largerId] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
  const { error } = await supabase.from('compatibility_insights').upsert(
    {
      user1_id: smallerId,
      user2_id: largerId,
      compatibility_text: compatibility,
    },
    { onConflict: 'user1_id,user2_id' }
  );

  if (error) {
    throw error;
  }

  return compatibility;
}

async function run() {
  const pairs = await fetchMatches();
  if (!pairs.length) {
    console.log('No matches found.');
    return;
  }

  console.log(`Found ${pairs.length} unique match pairs.`);
  if (DRY_RUN) {
    console.log('Dry run mode enabled; no OpenAI requests will be sent.');
    pairs.slice(0, 20).forEach((pair, index) => {
      console.log(`${index + 1}. ${pair.userId1} / ${pair.userId2} (${pair.matchType})`);
    });
    return;
  }

  const queue = [...pairs];
  let active = 0;
  let index = 0;
  let success = 0;
  let skipped = 0;
  let failed = 0;

  async function worker() {
    while (queue.length > 0) {
      const pair = queue.shift();
      if (!pair) break;
      active += 1;
      index += 1;

      try {
        process.stdout.write(`(${index}/${pairs.length}) ${pair.userId1} / ${pair.userId2} ... `);
        const compatibility = await generateCompatibility(pair);
        if (compatibility) {
          success += 1;
          console.log('ok');
        } else {
          skipped += 1;
          console.log('skipped');
        }
      } catch (error) {
        failed += 1;
        console.log(`failed: ${error.message}`);
      } finally {
        active -= 1;
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(MAX_CONCURRENT, pairs.length)) }, () => worker());
  await Promise.all(workers);

  console.log('\nFinished regeneration.');
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

run().catch((error) => {
  console.error('Regeneration failed:', error);
  process.exit(1);
});
