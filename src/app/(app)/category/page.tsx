"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setCategory } from "@/lib/store";

// Old category screen: the home screen now filters by category, so links to /category?id= land there
export default function CategoryPage() {
  return (
    <Suspense>
      <Redirect />
    </Suspense>
  );
}

function Redirect() {
  const router = useRouter();
  const id = Number(useSearchParams().get("id"));

  useEffect(() => {
    setCategory(Number.isInteger(id) && id > 0 ? id : "all");
    router.replace("/");
  }, [id, router]);

  return (
    <div className="flex justify-center py-20">
      <Loader2 className="size-7 animate-spin text-primary" />
    </div>
  );
}
