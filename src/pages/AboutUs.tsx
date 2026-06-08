import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";
import Noor from "@/assets/noor.avif";
import Shana from "@/assets/shana.avif";
import SPH from "@/assets/SPH_logo.avif";
import LinkedIn from "@/assets/LinkedIn.png";
import Footer from "./Footer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import HowOrbiitWorksDialog from "@/components/HowOrbiitWorksDialog";
import { useTranslation } from "react-i18next";

const AboutUs = () => {
  const { t } = useTranslation("aboutUs")
  const [showIntroDialog, setShowIntroDialog] = useState(false);

  // Names stay literal; only the role is a translation key.
  const teammates = [
    {
      name: "Noor Shaaban",
      photo: Noor,
      roleKey: "team.roles.coFounder",
      linkedIn: "https://www.linkedin.com/company/yourorbiit/",
    },
    {
      name: "Shana Stämpfli",
      photo: Shana,
      roleKey: "team.roles.coFounder",
      linkedIn: "https://www.linkedin.com/in/shana-s-61a492123/",
    },
  ];

  return (
    <div className="">
      <main className="container mx-auto px-4 py-8 max-w-dvw">
        <div className="flex flex-col items-center">

          <h1 className="text-4xl font-bold text-center text-white mb-8">
            {t("title")}
          </h1>

          <div className="text-xl text-wrap text-muted text-center leading-relaxed space-y-4">
            <p>{t("intro.p1")}</p>
            <p>{t("intro.p2")}</p>
            <p>{t("intro.p3")}</p>
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => setShowIntroDialog(true)}
              variant="outline"
              className="text-primary border-primary hover:bg-primary/10"
            >
              {t("howItWorks")}
            </Button>
          </div>

          <div className="md:ml-20">
            <h1 className="text-4xl font-bold text-center text-white mb-8 mt-12">
              {t("team.heading")}
            </h1>
            <div className="flex flex-col md:flex-row gap-8 justify-center">
              {teammates.map((teammate) => (
                <div key={teammate.name} className="bg-card p-8 rounded-3xl">
                  <img src={teammate.photo} alt={teammate.name} />
                  <div className="flex flex-row justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">{teammate.name}</h1>
                      <h2 className="text-xl">{t(teammate.roleKey)}</h2>
                    </div>
                    <div>
                      <Link to={teammate.linkedIn}>
                        <img
                          className="mt-2 w-10"
                          src={LinkedIn}
                          alt={t("linkedInAlt", { name: teammate.name })}
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:ml-20">
            <h1 className="text-4xl font-bold text-center text-white mb-8 mt-12">
              {t("collaborators.heading")}
            </h1>
            <img src={SPH} alt={t("collaborators.sphAlt")} />
          </div>
        </div>
      </main>
      <HowOrbiitWorksDialog open={showIntroDialog} onOpenChange={setShowIntroDialog} />
    </div>
  );
};

export default AboutUs;