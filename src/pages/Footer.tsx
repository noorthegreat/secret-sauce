import { Link } from "react-router-dom";

import BrandWordmark from "@/components/BrandWordmark";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const Footer = ({ className }: { className?: string }) => {
    return (
        <nav className={cn("w-full bg-transparent", className)}>
            <div className="flex flex-row items-start justify-between py-8">
                <div className="mx-5 flex flex-col items-start md:mx-10">
                    <BrandWordmark className="mb-6" />
                    <p className="max-w-sm text-sm leading-7 text-white/70 md:text-base">
                        A private, building-first product for resident introductions, amenity-based events, and better community insight.
                    </p>
                </div>

                <div className="mx-5 flex flex-col items-end text-right text-white md:mx-10">
                    <p className="mb-4 text-sm font-bold md:text-lg">
                        Resident Concierge Beta <br />
                        San Francisco, California
                    </p>

                    <Dialog>
                        <DialogTrigger className="mb-2 text-sm underline transition-colors hover:text-primary md:text-base">
                            Beta Feedback
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Beta Feedback</DialogTitle>
                                <DialogDescription>
                                    Found a bug or need to report a resident experience issue? Email us at{" "}
                                    <a href="mailto:hello@residentconcierge.co" className="text-primary hover:underline">
                                        hello@residentconcierge.co
                                    </a>
                                    <br /><br />
                                    Building teams can also share pilot feedback through the manager intake form.
                                </DialogDescription>
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>

                    <div className="flex flex-row gap-4">
                        <Link to="/for-buildings" className="text-sm underline transition-colors hover:text-primary md:text-base">
                            For Buildings
                        </Link>
                        <Link to="/join-community" className="text-sm underline transition-colors hover:text-primary md:text-base">
                            Join
                        </Link>
                        <Link to="/terms" className="text-sm underline transition-colors hover:text-primary md:text-base">
                            Terms
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Footer;
