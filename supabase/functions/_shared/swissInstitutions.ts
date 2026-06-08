export type InstitutionType = "university" | "hochschule";

export type SwissInstitution = {
  id: string;
  name: string;
  type: InstitutionType;
  emailDomains: string[];
};

export type SwissCityInstitutionGroup = {
  city: string;
  canton: string;
  institutions: SwissInstitution[];
};

export const SWISS_CITY_INSTITUTION_GROUPS: SwissCityInstitutionGroup[] = [
  {
    city: "Basel",
    canton: "BS",
    institutions: [
      { id: "unibas", name: "University of Basel", type: "university", emailDomains: ["unibas.ch"] },
      { id: "fhnw-basel", name: "FHNW University of Applied Sciences and Arts Northwestern Switzerland", type: "hochschule", emailDomains: ["fhnw.ch"] },
    ],
  },
  {
    city: "Bern",
    canton: "BE",
    institutions: [
      { id: "unibe", name: "University of Bern", type: "university", emailDomains: ["unibe.ch"] },
      { id: "bfh-bern", name: "Bern University of Applied Sciences (BFH)", type: "hochschule", emailDomains: ["bfh.ch"] },
    ],
  },
  {
    city: "Biel/Bienne",
    canton: "BE",
    institutions: [
      { id: "bfh-biel", name: "Bern University of Applied Sciences (BFH)", type: "hochschule", emailDomains: ["bfh.ch"] },
    ],
  },
  {
    city: "Brugg-Windisch",
    canton: "AG",
    institutions: [
      { id: "fhnw-brugg-windisch", name: "FHNW University of Applied Sciences and Arts Northwestern Switzerland", type: "hochschule", emailDomains: ["fhnw.ch"] },
    ],
  },
  {
    city: "Chur",
    canton: "GR",
    institutions: [
      { id: "fhgr", name: "University of Applied Sciences of the Grisons", type: "hochschule", emailDomains: ["fhgr.ch"] },
    ],
  },
  {
    city: "Fribourg",
    canton: "FR",
    institutions: [
      { id: "unifr", name: "University of Fribourg", type: "university", emailDomains: ["unifr.ch"] },
      { id: "hes-so-fribourg", name: "HES-SO University of Applied Sciences and Arts Western Switzerland", type: "hochschule", emailDomains: ["hefr.ch", "edu.hefr.ch"] },
    ],
  },
  {
    city: "Geneva",
    canton: "GE",
    institutions: [
      { id: "unige", name: "University of Geneva", type: "university", emailDomains: ["unige.ch"] },
      { id: "hes-so-geneva", name: "HES-SO University of Applied Sciences and Arts Western Switzerland", type: "hochschule", emailDomains: ["hesge.ch"] },
    ],
  },
  {
    city: "Lausanne",
    canton: "VD",
    institutions: [
      { id: "unil", name: "University of Lausanne", type: "university", emailDomains: ["unil.ch"] },
      { id: "epfl", name: "EPFL", type: "university", emailDomains: ["epfl.ch"] },
      { id: "hes-so-vaud", name: "HES-SO University of Applied Sciences and Arts Western Switzerland", type: "hochschule", emailDomains: ["heig-vd.ch", "eduvaud.ch", "ecal.ch", "hesav.ch"] },
    ],
  },
  {
    city: "Lucerne",
    canton: "LU",
    institutions: [
      { id: "unilu", name: "University of Lucerne", type: "university", emailDomains: ["unilu.ch"] },
      { id: "hslu", name: "Lucerne University of Applied Sciences and Arts", type: "hochschule", emailDomains: ["hslu.ch"] },
    ],
  },
  {
    city: "Lugano",
    canton: "TI",
    institutions: [
      { id: "usi", name: "Universita della Svizzera italiana", type: "university", emailDomains: ["usi.ch"] },
      { id: "supsi", name: "University of Applied Sciences and Arts of Southern Switzerland (SUPSI)", type: "hochschule", emailDomains: ["supsi.ch"] },
    ],
  },
  {
    city: "Muttenz",
    canton: "BL",
    institutions: [
      { id: "fhnw-muttenz", name: "FHNW University of Applied Sciences and Arts Northwestern Switzerland", type: "hochschule", emailDomains: ["fhnw.ch"] },
    ],
  },
  {
    city: "Neuchatel",
    canton: "NE",
    institutions: [
      { id: "unine", name: "University of Neuchatel", type: "university", emailDomains: ["unine.ch"] },
      { id: "he-arc-neuchatel", name: "HE-Arc", type: "hochschule", emailDomains: ["he-arc.ch"] },
    ],
  },
  {
    city: "Olten",
    canton: "SO",
    institutions: [
      { id: "fhnw-olten", name: "FHNW University of Applied Sciences and Arts Northwestern Switzerland", type: "hochschule", emailDomains: ["fhnw.ch"] },
    ],
  },
  {
    city: "Rapperswil-Jona",
    canton: "SG",
    institutions: [
      { id: "ost-rapperswil", name: "OST Eastern Switzerland University of Applied Sciences", type: "hochschule", emailDomains: ["ost.ch"] },
    ],
  },
  {
    city: "Sion",
    canton: "VS",
    institutions: [
      { id: "hes-so-valais", name: "HES-SO Valais-Wallis", type: "hochschule", emailDomains: ["hevs.ch"] },
    ],
  },
  {
    city: "St. Gallen",
    canton: "SG",
    institutions: [
      { id: "hsg", name: "University of St. Gallen", type: "university", emailDomains: ["unisg.ch", "student.unisg.ch"] },
      { id: "ost-stgallen", name: "OST Eastern Switzerland University of Applied Sciences", type: "hochschule", emailDomains: ["ost.ch"] },
    ],
  },
  {
    city: "Zug",
    canton: "ZG",
    institutions: [
      { id: "phzug", name: "Pädagogische Hochschule Zug (PH Zug)", type: "hochschule", emailDomains: ["phzg.ch"] },
    ],
  },
  {
    city: "Winterthur",
    canton: "ZH",
    institutions: [
      { id: "zhaw", name: "ZHAW Zurich University of Applied Sciences", type: "hochschule", emailDomains: ["zhaw.ch"] },
    ],
  },
  {
    city: "Zurich",
    canton: "ZH",
    institutions: [
      { id: "uzh", name: "University of Zurich", type: "university", emailDomains: ["uzh.ch"] },
      { id: "ethz", name: "ETH Zurich", type: "university", emailDomains: ["ethz.ch", "student.ethz.ch"] },
      { id: "zhaw-zurich", name: "ZHAW Zurich University of Applied Sciences", type: "hochschule", emailDomains: ["zhaw.ch"] },
      { id: "zhdk", name: "Zurich University of the Arts (ZHdK)", type: "hochschule", emailDomains: ["zhdk.ch"] },
      { id: "phzh", name: "Zurich University of Teacher Education (PHZH)", type: "hochschule", emailDomains: ["phzh.ch"] },
      { id: "hfh", name: "Intercantonal University of Special Needs Education (HfH)", type: "hochschule", emailDomains: ["hfh.ch"] },
    ],
  },
];

export const SWISS_INSTITUTION_INDEX = Object.fromEntries(
  SWISS_CITY_INSTITUTION_GROUPS.flatMap(({ city, institutions }) =>
    institutions.map((institution) => [
      institution.id,
      { ...institution, city },
    ]),
  ),
) as Record<string, SwissInstitution & { city: string }>;
