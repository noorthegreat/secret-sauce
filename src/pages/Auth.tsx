import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { z } from "zod";

import BrandWordmark from "@/components/BrandWordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSession from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be less than 72 characters"),
  phoneNumber: z.string().trim().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be less than 15 digits").optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state } = useLocation();
  const [isLogin, setIsLogin] = useState(state?.isSignIn ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { session, sessionLoading } = useSession();

  useEffect(() => {
    if (!sessionLoading && session) {
      navigate("/questionnaire-intro", { replace: true });
    }
  }, [navigate, session, sessionLoading]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = authSchema.safeParse({ email, password, phoneNumber: isLogin ? undefined : phoneNumber });
      if (!validation.success) {
        const errors = validation.error.errors.map((error) => error.message).join(", ");
        throw new Error(errors);
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
      } else {
        const emailRedirectTo = `${window.location.origin}/auth/confirm`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: {
              phone_number: phoneNumber,
            },
          },
        });

        if (error) throw error;

        setVerificationEmailSent(true);
        toast({
          title: "Check your email!",
          description: "We've sent you a verification link to confirm your account.",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = z.string().email("Invalid email address").safeParse(email);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const redirectTo = `${window.location.origin}/auth/confirm`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast({
        title: "Check your email!",
        description: "We've sent you a password reset link.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderAuthNotice = ({
    description,
    primaryActionLabel,
    onPrimaryAction,
  }: {
    description: React.ReactNode;
    primaryActionLabel: string;
    onPrimaryAction: () => void;
  }) => (
    <div className="flex min-h-[calc(100dvh-4rem)] h-full w-full items-center justify-center p-4">
      <Card className="glass-border relative w-full max-w-md border-none bg-transparent shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 right-4 [&_svg]:size-7">
            <X className="h-5 w-5 text-white" />
          </Button>
          <div className="mx-auto flex justify-center">
            <BrandWordmark />
          </div>
          <CardTitle className="text-3xl font-bold text-white">
            Check your email
          </CardTitle>
          <CardDescription className="text-base text-white">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 text-center">
            <p className="text-sm text-white/80">
              Click the link in the email to continue.
            </p>
            <p className="text-sm text-white/80">
              Don&apos;t see the email? Check your spam folder.
            </p>
            <Button type="button" variant="glass" onClick={onPrimaryAction} className="w-full">
              {primaryActionLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (sessionLoading || session) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] h-full w-full items-center justify-center p-4">
        <Card className="glass-border w-full max-w-md border-none bg-transparent shadow-xl">
          <CardContent className="py-12 text-center text-white">
            Loading...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetEmailSent) {
    return renderAuthNotice({
      description: <>We&apos;ve sent a password reset link to <span className="font-semibold text-white">{email}</span></>,
      primaryActionLabel: "Back to Log In",
      onPrimaryAction: () => {
        setResetEmailSent(false);
        setIsResettingPassword(false);
        setIsLogin(true);
      },
    });
  }

  if (verificationEmailSent) {
    return renderAuthNotice({
      description: <>We&apos;ve sent a verification link to <span className="font-semibold text-white">{email}</span></>,
      primaryActionLabel: "Log In",
      onPrimaryAction: () => {
        setVerificationEmailSent(false);
        setIsLogin(true);
      },
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] h-full w-full items-center justify-center p-4">
      <Card className="glass-border relative w-full max-w-md border-none bg-transparent shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 right-4 [&_svg]:size-7">
            <X className="h-5 w-5 text-white" />
          </Button>
          <div className="mx-auto flex justify-center">
            <BrandWordmark />
          </div>
          <CardTitle className="bg-transparent bg-clip-text text-3xl font-bold text-white">
            {isResettingPassword ? "Reset Password" : isLogin ? "Welcome back" : "Join your building community"}
          </CardTitle>
          <CardDescription className="text-white">
            {isResettingPassword
              ? "Enter your email to receive a password reset link"
              : isLogin
                ? "Sign in to access your private building community."
                : "Create your Resident Concierge account to continue your building onboarding."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isResettingPassword ? handlePasswordReset : handleAuth} className="space-y-4">
            <div className="space-y-2 text-white">
              <Label htmlFor="email">Email</Label>
              <Input
                className="text-black"
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isResettingPassword && (
              <div className="space-y-2 text-white">
                <Label htmlFor="password">Password</Label>
                <Input
                  className="text-black"
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}
            {!isLogin && (
              <div className="space-y-2 text-white">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div id="phoneNumber" className="text-black">
                  <PhoneInput
                    country="us"
                    preferredCountries={["us", "ca"]}
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(phone) => setPhoneNumber(phone)}
                  />
                </div>
              </div>
            )}
            <Button
              type="submit"
              variant="glass"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : isResettingPassword ? "Send Reset Link" : isLogin ? "Log In" : "Sign Up"}
            </Button>
            {isLogin && !isResettingPassword && (
              <button
                type="button"
                onClick={() => setIsResettingPassword(true)}
                className="w-full text-sm text-white transition-colors hover:text-primary"
              >
                Forgot password?
              </button>
            )}
          </form>
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                if (isResettingPassword) {
                  setIsResettingPassword(false);
                } else {
                  setIsLogin(!isLogin);
                }
              }}
              className="text-sm text-white transition-colors hover:text-primary"
            >
              {isResettingPassword ? (
                <p>Back to <span className="underline">Log in</span></p>
              ) : isLogin ? (
                <p>Need an account? <span className="underline">Sign up</span></p>
              ) : (
                <p>Already have an account? <span className="underline">Log in</span></p>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
