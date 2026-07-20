"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      offset={24}
      gap={10}
      icons={{
        success: <CircleCheckIcon className="size-4 text-rose-500" />,
        info: <InfoIcon className="size-4 text-stone-500" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error: <OctagonXIcon className="size-4 text-rose-600" />,
        loading: <Loader2Icon className="size-4 animate-spin text-rose-400" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-2xl !border-rose-200/70 !bg-[linear-gradient(180deg,rgba(255,252,249,0.98),rgba(255,245,240,0.96))] !text-stone-800 !shadow-[0_18px_40px_-24px_rgba(80,40,40,0.55)] !ring-1 !ring-rose-100/80 backdrop-blur-md",
          title: "!text-sm !font-medium !text-stone-800",
          description: "!text-sm !text-stone-500",
          actionButton:
            "!rounded-full !bg-rose-500/90 !text-white !text-xs !font-medium hover:!bg-rose-500",
          cancelButton:
            "!rounded-full !bg-white/80 !text-stone-600 !text-xs !font-medium hover:!bg-white",
          success: "!border-rose-200/80",
          error: "!border-rose-300/80",
          warning: "!border-amber-200/80",
          info: "!border-stone-200/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
