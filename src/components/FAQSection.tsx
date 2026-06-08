import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const FAQItem = ({
    value,
    trigger,
    children,
    delay
}: {
    value: string;
    trigger: string;
    children: React.ReactNode;
    delay: string;
}) => (
    <AccordionItem
        value={value}
        className="border-white/10 faq-item opacity-0 translate-y-10 transition-all duration-700 ease-out"
        style={{ transitionDelay: delay }}
    >
        <AccordionTrigger className=" text-black  text-lg font-medium text-left ">
            {trigger}
        </AccordionTrigger>
        <AccordionContent className="text-black text-base leading-relaxed">
            {children}
        </AccordionContent>
    </AccordionItem>
);

const FAQSection = () => {
    const { t } = useTranslation("faqSection");
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        observer.current = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    entry.target.classList.remove('opacity-0', 'translate-y-10');
                    observer.current?.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        const elements = document.querySelectorAll('.faq-item');
        elements.forEach((el) => observer.current?.observe(el));

        return () => observer.current?.disconnect();
    }, []);

    return (
        <section className="container mx-auto px-4 py-16 max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-black text-center mb-12">
                {t("heading")}
            </h2>

            <Accordion type="single" collapsible className="w-full space-y-4 ">
                <FAQItem value="item-1" trigger={t("items.pairing.trigger")} delay="0ms">
                    <p className="mb-4">{t("items.pairing.p1")}</p>
                    <p className="mb-4">{t("items.pairing.p2")}</p>
                    <p>{t("items.pairing.p3")}</p>
                </FAQItem>

                <FAQItem value="item-2" trigger={t("items.howItWorks.trigger")} delay="100ms">
                    <ol className="list-decimal list-inside space-y-2 pl-2">
                        <li>{t("items.howItWorks.step1")}</li>
                        <li>{t("items.howItWorks.step2")}</li>
                        <li>{t("items.howItWorks.step3")}</li>
                        <li>{t("items.howItWorks.step4")}</li>
                        <li>{t("items.howItWorks.step5")}</li>
                    </ol>
                </FAQItem>

                <FAQItem value="item-3" trigger={t("items.preview.trigger")} delay="200ms">
                    <p className="mb-2">{t("items.preview.intro")}</p>
                    <ul className="list-disc list-inside space-y-1 pl-2 mb-4">
                        <li>{t("items.preview.bullet1")}</li>
                        <li>{t("items.preview.bullet2")}</li>
                        <li>{t("items.preview.bullet3")}</li>
                    </ul>
                    <p>{t("items.preview.outro")}</p>
                </FAQItem>

                <FAQItem value="item-4" trigger={t("items.notMatch.trigger")} delay="300ms">
                    <p className="mb-4">{t("items.notMatch.p1")}</p>
                    <p className="mb-4">{t("items.notMatch.p2")}</p>
                    <p>{t("items.notMatch.p3")}</p>
                </FAQItem>

                <FAQItem value="item-5" trigger={t("items.participants.trigger")} delay="400ms">
                    <p className="mb-4">{t("items.participants.p1")}</p>
                    <p className="mb-4">{t("items.participants.p2")}</p>
                    <p>{t("items.participants.p3")}</p>
                </FAQItem>

                <FAQItem value="item-6" trigger={t("items.lastMinute.trigger")} delay="500ms">
                    <p className="mb-4">{t("items.lastMinute.p1")}</p>
                    <p>{t("items.lastMinute.p2")}</p>
                </FAQItem>

                <FAQItem value="item-7" trigger={t("items.duration.trigger")} delay="600ms">
                    <p className="mb-4">{t("items.duration.p1")}</p>
                    <p>{t("items.duration.p2")}</p>
                </FAQItem>

                <FAQItem value="item-8" trigger={t("items.venues.trigger")} delay="700ms">
                    <p>{t("items.venues.p1")}</p>
                </FAQItem>

                <FAQItem value="item-9" trigger={t("items.noChat.trigger")} delay="800ms">
                    <p className="mb-4">{t("items.noChat.p1")}</p>
                    <p>{t("items.noChat.p2")}</p>
                </FAQItem>

                <FAQItem value="item-10" trigger={t("items.privacy.trigger")} delay="900ms">
                    <p className="mb-4">{t("items.privacy.p1")}</p>
                    <p>{t("items.privacy.p2")}</p>
                </FAQItem>
            </Accordion>
        </section>
    );
};

export default FAQSection;