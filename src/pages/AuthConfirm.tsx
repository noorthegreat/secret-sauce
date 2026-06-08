import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email" | "email_change";

const supportedTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email",
  "email_change",
]);

const getDefaultRedirect = (type: EmailOtpType) => {
  if (type === "recovery") {
    return "/change-password?type=recovery";
  }

  if (type === "email_change") {
    return "/profile";
  }

  return "/questionnaire-intro";
};

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Handle implicit flow (hash tokens) automatically — these are not one-time-use
  // in the same way and are not pre-scanned by email security tools.
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const hashType = hashParams.get("type") as EmailOtpType | null;
    const next = searchParams.get("next");

    if (accessToken && hashType && supportedTypes.has(hashType)) {
      const refreshToken = hashParams.get("refresh_token");
      if (refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            navigate("/auth", { replace: true });
            return;
          }
          const target = next?.startsWith("/") ? next : getDefaultRedirect(hashType);
          navigate(target, { replace: true });
        });
      }
    }
  }, [navigate, searchParams, toast]);

  const handleConfirm = async () => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const next = searchParams.get("next");

    if (!tokenHash || !type || !supportedTypes.has(type as EmailOtpType)) {
      toast({
        title: "Error",
        description: "Invalid or expired link.",
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
      return;
    }

    const target = next?.startsWith("/") ? next : getDefaultRedirect(type as EmailOtpType);
    navigate(target, { replace: true });
  };

  // If no token_hash in URL, this page was reached without a valid link
  const tokenHash = searchParams.get("token_hash");
  if (!tokenHash) {
    return null;
  }

  return (
    <div className="min-h-[60vh]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Confirm your email</CardTitle>
              <CardDescription>Click the button below to verify your email and continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleConfirm} disabled={loading} className="w-full">
                {loading ? "Verifying..." : "Confirm email"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthConfirm;
