import { Suspense } from "react";
import Hero from "@/sections/Hero";
import HeritageStory from "@/sections/HeritageStory";
import StoreProductsByCategory from "@/sections/StoreProductsByCategory";
import Categories from "@/sections/Categories";
import BestSellers from "@/sections/BestSellers";

export default async function Home() {
  return (
    <>
      <Suspense fallback={<div className="h-[56svh] md:h-[600px]" />}>
        <Hero />
      </Suspense>
      <Suspense fallback={null}>
        <BestSellers />
      </Suspense>
      <Suspense fallback={null}>
        <StoreProductsByCategory />
      </Suspense>
      <Categories />
      <HeritageStory />
    </>
  );
}
