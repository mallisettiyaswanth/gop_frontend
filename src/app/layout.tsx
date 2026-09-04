import type { Metadata } from "next";
import { Inter, Geist, Fira_Code } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const geist = Geist({ variable: "--font-heading", subsets: ["latin"] });
const firaCode = Fira_Code({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Gym",
  description: "Gym management, simplified.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", inter.variable, geist.variable, firaCode.variable)}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
