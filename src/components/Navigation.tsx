import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Calendar, FileText, Heart, LogOut, Menu, Shield, User } from "lucide-react";
import { useTranslation } from "react-i18next";

import BrandWordmark from "@/components/BrandWordmark";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import useSession from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

interface NavigationProps {
  hideProfileItems?: boolean;
}

const Navigation = ({ hideProfileItems = false }: NavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const { t, i18n } = useTranslation("common");
  const isDE = i18n.language?.startsWith("de") ?? false;
  const toggleLanguage = () => i18n.changeLanguage(isDE ? "en" : "de");

  useEffect(() => {
    const checkAdminRole = async () => {
      if (session) {
        const { data: hasAdminRole } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        });
        setIsAdmin(!!hasAdminRole);
      }
    };
    checkAdminRole();
  }, [session]);

  if (!session) {
    hideProfileItems = true;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    { profile_item: true, path: "/matches", label: t("nav.matches"), icon: Heart },
    { profile_item: true, path: "/dates", label: t("nav.dates"), icon: Calendar },
    { profile_item: true, path: "/questionnaire-intro", label: t("nav.survey"), icon: FileText },
    { profile_item: true, path: "/profile", label: t("nav.profile"), icon: User },
    { profile_item: true, path: "/admin", label: t("nav.admin"), icon: Shield, admin_only: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-slate-950/18 shadow-xs backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/">
            <BrandWordmark compact />
          </Link>

          <div className="hidden items-center space-x-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.profile_item && hideProfileItems) {
                return null;
              }
              if ((item as { admin_only?: boolean }).admin_only && !isAdmin) {
                return null;
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-white text-black"
                      : "text-white hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {session ? (
            <div className="hidden items-center gap-1 md:flex">
              <button
                onClick={toggleLanguage}
                className="rounded px-2 py-1 text-xs font-medium text-white/60 transition-colors hover:text-white"
              >
                <span className={isDE ? "font-semibold text-white" : "text-white/40"}>DE</span>
                <span className="mx-1 text-white/30">|</span>
                <span className={!isDE ? "font-semibold text-white" : "text-white/40"}>EN</span>
              </button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white hover:text-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                {t("actions.signOut")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="hidden rounded px-2 py-1 text-xs font-medium text-white/60 transition-colors hover:text-white md:block"
              >
                <span className={isDE ? "font-semibold text-white" : "text-white/40"}>DE</span>
                <span className="mx-1 text-white/30">|</span>
                <span className={!isDE ? "font-semibold text-white" : "text-white/40"}>EN</span>
              </button>
              <Button
                size="default"
                variant="glass"
                onClick={() => navigate("/for-buildings")}
                className="px-3 text-xs md:px-4 md:text-sm"
              >
                For Buildings
              </Button>
              <Button
                size="default"
                variant="glass"
                onClick={() => navigate("/join-community")}
                className="px-3 text-xs md:px-4 md:text-sm"
              >
                Join Your Building
              </Button>
              <Button
                size="default"
                onClick={() => navigate("/auth", { state: { isSignIn: true } })}
                className="rounded-full bg-white px-3 text-xs text-slate-950 hover:bg-white/90 md:px-4 md:text-sm"
              >
                Sign In
              </Button>
            </div>
          )}

          {session && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden [&_svg]:size-7">
                  <Menu className="h-10 w-10" color="white" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 border-[#3a2a9c]/35 bg-[#17064a]/98 text-white backdrop-blur-xl">
                <div className="mt-8 flex flex-col space-y-4">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    if (item.profile_item && hideProfileItems) {
                      return null;
                    }
                    if ((item as { admin_only?: boolean }).admin_only && !isAdmin) {
                      return null;
                    }
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setOpen(false)}
                        className={`flex items-center rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                          isActive(item.path)
                            ? "bg-[#3a2a9c]/45 text-white"
                            : "text-white/80 hover:bg-[#3a2a9c]/30 hover:text-white"
                        }`}
                      >
                        <Icon className="mr-3 h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:text-white"
                  >
                    <span className={isDE ? "font-semibold text-white" : "text-white/40"}>DE</span>
                    <span className="mx-2 text-white/30">|</span>
                    <span className={!isDE ? "font-semibold text-white" : "text-white/40"}>EN</span>
                  </button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOpen(false);
                      handleSignOut();
                    }}
                    className="justify-start px-4 text-white/80 hover:bg-[#3a2a9c]/30 hover:text-white"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    {t("actions.signOut")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
