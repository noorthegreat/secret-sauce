import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, MapPin, RotateCcw, MessageSquare, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HowOrbiitWorksDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const HowOrbiitWorksDialog = ({ open, onOpenChange }: HowOrbiitWorksDialogProps) => {
    const { t } = useTranslation("howOrbiitWorksDialog");
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center mb-4">{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Step 1 */}
                    <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-primary/10 rounded-full">
                            <Heart className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{t("steps.matches.title")}</h3>
                            <p className="text-muted-foreground">
                                {t("steps.matches.description")}
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-secondary/10 rounded-full">
                            <Calendar className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{t("steps.schedule.title")}</h3>
                            <p className="text-muted-foreground">
                                {t("steps.schedule.description")}
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-accent/10 rounded-full">
                            <MapPin className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{t("steps.details.title")}</h3>
                            <p className="text-muted-foreground">
                                {t("steps.details.description")}
                            </p>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-primary/10 rounded-full">
                            <RotateCcw className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{t("steps.reschedule.title")}</h3>
                            <p className="text-muted-foreground">
                                {t("steps.reschedule.description")}
                            </p>
                        </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-secondary/10 rounded-full">
                            <MessageSquare className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{t("steps.feedback.title")}</h3>
                            <p className="text-muted-foreground">
                                {t("steps.feedback.description")}
                            </p>
                        </div>
                    </div>

                    {/* Step 6 */}
                    <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-destructive/10 rounded-full">
                            <ShieldAlert className="w-6 h-6 text-destructive" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{t("steps.noGhosting.title")}</h3>
                            <p className="text-muted-foreground">
                                {t("steps.noGhosting.description")}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-center">
                    <Button
                        size="lg"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto px-8"
                    >
                        {t("gotIt")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default HowOrbiitWorksDialog;
