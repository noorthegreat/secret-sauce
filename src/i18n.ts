import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import HttpBackend from "i18next-http-backend"

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: "en",
        supportedLngs: ["en", "de"],
        ns: ["common", "aboutUs", "datesList", "matches", "availabilityPlanner", "datePreferences",
            "dateView", "profileViewDialog", "auth", "profile", "profileSetup", "questionnaireIntro",
            "indexMainSection", "perksSection", "timelineSection", "carouselSection", "faqSection",
            "howOrbiitWorksDialog", "switzerlandWaitlist"
        ],
        defaultNS: "common",
        debug: import.meta.env.DEV,
        interpolation: { escapeValue: false },
        detection: {
            order: ["querystring", "localStorage", "navigator"],
            lookupQuerystring: "lng",
            caches: ["localStorage"],
        },
        backend: {
            loadPath: "/locales/\{\{lng\}\}/\{\{ns\}\}.json",
        },
        react: { useSuspense: false },
    })

export default i18n