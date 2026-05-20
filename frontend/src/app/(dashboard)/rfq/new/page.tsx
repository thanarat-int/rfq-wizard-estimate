"use client";

import { Suspense } from "react";
import TopBar from "@/components/layout/TopBar";
import ViewTransition from "@/components/layout/ViewTransition";
import InputView from "@/components/views/InputView";
import SpecReviewView from "@/components/views/SpecReviewView";
import ResultsView from "@/components/views/ResultsView";
import { useAppStore } from "@/lib/store";

function RFQContent() {
  const { currentView } = useAppStore();

  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="pt-14">
        <ViewTransition viewKey={currentView}>
          {currentView === "input" && <InputView />}
          {currentView === "spec" && <SpecReviewView />}
          {currentView === "results" && <ResultsView />}
        </ViewTransition>
      </div>
    </div>
  );
}

export default function NewRFQPage() {
  return (
    <Suspense>
      <RFQContent />
    </Suspense>
  );
}
