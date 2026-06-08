

import TimelineSection from "@/components/TimelineSection";
import Countdown from "@/components/Countdown";
import EventBanner from "@/components/EventBanner";

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const IndexMainSection = () => {
    const navigate = useNavigate();
    const { t } = useTranslation("indexMainSection");
    return (
        <div className="container mx-auto px-4 py-20 pb-0">
            <div className="text-center max-w-3xl mx-auto space-y-8">

                <div className="relative">
                    <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mt-4 md:mt-8 text-shadow-lg/50 mb-4">{t("hero.title")}</h1>
                    {/* Mobile only: in-flow between heading and countdown */}
                    <p className="text-2xl md:text-3xl text-white text-center -mb-2">{t("hero.subtitle")}</p>
                </div>
                <Countdown />

                <p className="text-xl text-white leading-relaxed text-shadow-lg/50">
                    {t("hero.tagline")}
                </p>

                <div className="flex flex-row gap-4 justify-center pt-8">
                    <Button
                        size="lg"
                        variant="glass"
                        onClick={() => navigate("/auth", { state: { isSignIn: false } })}
                    >
                        {t("cta.getMatched")}
                    </Button>
                </div>
                <div className="flex flex-col items-center gap-3 pb-36">
                    <Button
                        size="sm"
                        variant="glass"
                        className="px-5 text-sm"
                        onClick={() => navigate("/switzerland-waitlist")}
                    >
                        {t("cta.waitlist")}
                    </Button>
                    <p className="max-w-md text-sm text-white/75">
                        {t("waitlistHelp")}
                    </p>
                </div>
            </div>

            <div className="mx-auto -mt-20 mb-16 max-w-5xl px-4">
                <EventBanner variant="public" />
            </div>

            <h2 className="animate-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out text-3xl md:text-5xl font-bold text-white text-center mb-0 mt-8 text-shadow-lg/50">{t("howItWorks")}</h2>
            <TimelineSection />
        </div>
    );
};

export default IndexMainSection;
