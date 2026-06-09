import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Navigation from "@/components/Navigation";
import ResidentConciergeLanding from "@/components/ResidentConciergeLanding";
import Footer from "./Footer";
import NightSkyVideoMp4 from "@/assets/nightsky.mp4";
import NightSkyVideoWebM from "@/assets/nightsky.webm";
import ForegroundImage from "@/assets/index-foreground.webp";
import StarsImage from "@/assets/index-stars.webp";
import CloudsImage from "@/assets/index-clouds.webp";

const BackgroundWrapper = ({
  children,
  bgImage,
  firstOne,
  className = "",
  mask = "linear-gradient(to top, black, black 70%, transparent)",
}: {
  children: React.ReactNode;
  bgImage: string;
  firstOne?: boolean;
  className?: string;
  mask?: string;
}) => {
  const toggle = true;
  if (!toggle) {
    return <>{children}</>;
  }
  return (
    <section className={`relative min-h-dvh w-full ${className}`}>
      <div
        className={`z-4 sticky -top-[30%] w-full overflow-clip ${firstOne ? "-mb-[120dvh] top-0 " : "-mb-[100dvh]"} min-h-[calc(100dvh+200px)] `}
        style={{
          maskImage: firstOne ? null : mask,
          WebkitMaskImage: firstOne ? null : mask,
        }}
      >
        <div className="z-5 absolute top-1/2 left-1/2 h-[300vmax] w-[300vmax] -translate-x-1/2 -translate-y-1/5">
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 animate-[spin_360s_linear_infinite]">
            <div
              className="h-full w-full bg-cover bg-center -scale-x-100 -scale-y-100"
              style={{ backgroundImage: `url(${bgImage})` }}
            />
            <div
              className="h-full w-full bg-cover bg-center -rotate-90"
              style={{ backgroundImage: `url(${bgImage})` }}
            />
            <div
              className="h-full w-full rotate-90 bg-cover bg-center"
              style={{ backgroundImage: `url(${bgImage})` }}
            />
            <div
              className="h-full w-full rotate-180 bg-cover bg-center -scale-x-100 -scale-y-100"
              style={{ backgroundImage: `url(${bgImage})` }}
            />
          </div>
        </div>
      </div>

      {firstOne && (
        <>
          <video
            autoPlay
            muted
            playsInline
            className="z-8 fixed top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 object-cover"
          >
            <source src={NightSkyVideoMp4} type='video/mp4; codecs="hvc1"' />
            <source src={NightSkyVideoWebM} type="video/webm" />
          </video>
          <div
            className="z-7 fixed inset-0 min-h-dvh bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${ForegroundImage})`,
            }}
          />
        </>
      )}
      <div className="z-10 relative h-full">{children}</div>
    </section>
  );
};

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && type) {
      navigate(`/auth/confirm?token_hash=${tokenHash}&type=${type}`, { replace: true });
      return;
    }
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashType = hashParams.get("type");
    if (hashType === "recovery") {
      navigate(`/change-password${window.location.hash}`, { replace: true });
    }
  }, [navigate]);

  const observer = React.useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-10");
          observer.current?.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: "0px",
    });

    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((element) => observer.current?.observe(element));

    return () => observer.current?.disconnect();
  }, []);

  return (
    <div className="absolute min-h-dvh bg-black">
      <Navigation />
      <BackgroundWrapper bgImage={StarsImage} firstOne>
        <ResidentConciergeLanding />
      </BackgroundWrapper>

      <BackgroundWrapper bgImage={CloudsImage}>
        <div className="container mx-auto px-4">
          <Footer />
        </div>
      </BackgroundWrapper>
    </div>
  );
};

export default Index;
