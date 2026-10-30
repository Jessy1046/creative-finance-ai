import { notFound } from "next/navigation";
import { LESSONS, LESSON_BY_SLUG } from "@/domain/academy/lessons";
import { LessonView } from "./LessonView";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = LESSON_BY_SLUG[slug];
  return { title: l ? l.title : "Lección" };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!LESSON_BY_SLUG[slug]) notFound();
  return <LessonView slug={slug} />;
}
