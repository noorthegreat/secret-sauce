import { Outlet } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/pages/Footer";
import BackgroundImage from "@/assets/bg2.webp";
import { cn } from "@/lib/utils";
import CollabPageBackdrop from "@/components/CollabPageBackdrop";
import { useEffect } from "react";

const MainLayout = ({
    backgroundImage = BackgroundImage,
    footerOverlay = false,
    useCollabBackdrop = false,
}: {
    backgroundImage?: string;
    footerOverlay?: boolean;
    useCollabBackdrop?: boolean;
    }) => {
    useEffect(() => {
        if (!useCollabBackdrop) return;

        const rootEl = document.getElementById("root");
        const prevHtmlBg = document.documentElement.style.backgroundColor;
        const prevBodyBg = document.body.style.backgroundColor;
        const prevRootBg = rootEl?.style.backgroundColor ?? "";

        // Keep route chrome/background transparent for collab pages.
        document.documentElement.style.backgroundColor = "transparent";
        document.body.style.backgroundColor = "transparent";
        if (rootEl) rootEl.style.backgroundColor = "transparent";

        return () => {
            document.documentElement.style.backgroundColor = prevHtmlBg;
            document.body.style.backgroundColor = prevBodyBg;
            if (rootEl) rootEl.style.backgroundColor = prevRootBg;
        };
    }, [useCollabBackdrop]);
    // Check if we are on the Auth page to potentially adjust layout (optional optimization)
    // For now, we apply standard layout.

    return (
        <div
            className="relative isolate min-h-dvh overflow-x-hidden flex flex-col"
        >
            <div
                aria-hidden="true"
                style={{ backgroundImage: `url(${backgroundImage})` }}
                className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-scroll md:bg-fixed"
            >
                <div className="absolute inset-0 backdrop-blur-sm" />
            </div>
            {useCollabBackdrop && <CollabPageBackdrop />}
            <div className="relative z-10 min-h-dvh">
                <Navigation />

                    {/* 
        Main content area. 
        Flex-grow allows the content to push the footer down if content is short.
        pt-16 accounts for fixed navigation height (approx 64px/4rem).
      */}
                <main
                    className={cn(
                        "grow pt-16 flex flex-col relative w-full",
                        footerOverlay && "pb-44 md:pb-52"
                    )}
                >
                    <Outlet />
                </main>

                {footerOverlay ? (
                    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
                        <div className="pointer-events-auto">
                            <Footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" />
                        </div>
                    </div>
                ) : (
                    <Footer />
                )}
            </div>
        </div>
    );
};

export default MainLayout;
