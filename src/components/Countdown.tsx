import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { nextZurichMondayMidnightMs } from "@/lib/zurich-time";

const Countdown = () => {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);

    useEffect(() => {
        const fetchTotalUsers = async () => {
            const { data, error } = await supabase.rpc('get_total_users_joined');
            if (!error && data !== null) {
                setTotalUsers(data);
            }
        };
        fetchTotalUsers();
    }, []);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();

            // Find next Monday 00:00 Europe/Zurich
            const target = new Date(nextZurichMondayMidnightMs());

            setTargetDate(prev => {
                if (!prev || prev.getTime() !== target.getTime()) {
                    return target;
                }
                return prev;
            });

            const diff = target.getTime() - now.getTime();

            if (diff < 0) return null;

            return {
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000)
            };
        };

        // Initial calculation
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (!timeLeft) return null;

    return (
        <div className="flex flex-col items-center justify-center gap-2 mt-6 animate-in fade-in duration-700">
            <div className="flex gap-2 justify-center items-center">
                <span className="text-4xl md:text-5xl font-mono font-bold tracking-widest text-white drop-shadow-md tabular-nums">
                    {String(timeLeft.days).padStart(2, '0')}:
                    {String(timeLeft.hours).padStart(2, '0')}:
                    {String(timeLeft.minutes).padStart(2, '0')}:
                    {String(timeLeft.seconds).padStart(2, '0')}
                </span>
            </div>
            {targetDate && (
                <span className="text-sm md:text-base font-light tracking-wider text-white/80 uppercase">
                    Next weekly drop: {new Intl.DateTimeFormat('en-US', {
                        timeZone: 'Europe/Zurich',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    }).format(targetDate)}
                </span>
            )}
            {totalUsers !== null && (
                <span className="text-xs md:text-sm font-light tracking-wider text-white/60 uppercase">
                    Total users joined: {totalUsers}
                </span>
            )}
        </div>
    );
};

export default Countdown;
