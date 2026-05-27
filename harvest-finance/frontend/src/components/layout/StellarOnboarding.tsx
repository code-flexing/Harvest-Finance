"use client";

import { useState, useEffect } from "react";
import { ChevronRight, CheckCircle, ExternalLink } from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: string;
  link?: string;
  completed: boolean;
}

export function StellarOnboarding() {
  const [showTour, setShowTour] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "create-account",
      title: "Create Stellar Account",
      description: "Set up your Stellar account to start transacting on the network",
      action: "Learn more",
      link: "https://developers.stellar.org/docs/wallets-and-clients/getting-started",
      completed: false,
    },
    {
      id: "fund-account",
      title: "Fund Your Account with XLM",
      description: "You need at least 1 XLM to activate your account on Stellar testnet or mainnet",
      action: "Get XLM from Faucet",
      link: "https://developers.stellar.org/docs/wallets-and-clients/testnet#create-an-account",
      completed: false,
    },
    {
      id: "connect-wallet",
      title: "Connect Your Wallet",
      description: "Use Freighter or another Stellar-compatible wallet to connect to Harvest Finance",
      action: "Connect Wallet",
      link: undefined,
      completed: false,
    },
    {
      id: "explore-vaults",
      title: "Explore Smart Vaults",
      description: "Browse available vaults and choose strategies aligned with your investment goals",
      action: "Browse Vaults",
      link: "/vaults",
      completed: false,
    },
    {
      id: "make-deposit",
      title: "Make Your First Deposit",
      description: "Start small with your first deposit to become familiar with the platform",
      action: "Deposit Now",
      link: "/vaults",
      completed: false,
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("harvest:onboarding-seen");
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const markStepCompleted = (stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, completed: true } : step
      )
    );
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem("harvest:onboarding-seen", "true");
    setShowTour(false);
  };

  if (!showTour) {
    return null;
  }

  const step = steps[currentStep];
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome to Harvest Finance
          </h2>
          <p className="text-gray-600 mt-1">
            Guided tour: Fund your Stellar account and start earning yields
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {step.completed ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="text-gray-600 mt-2">{step.description}</p>
              </div>
            </div>

            {/* Mini Steps */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4 space-y-2">
              {currentStep === 0 && (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="font-bold">1.</span> Visit Stellar&apos;s official website
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">2.</span> Generate a keypair (public & secret key)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">3.</span> Save your secret key securely
                  </li>
                </ul>
              )}
              {currentStep === 1 && (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="font-bold">1.</span> Visit the Stellar Testnet Faucet
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">2.</span> Paste your Stellar account address
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">3.</span> Receive 10,000 XLM for testing
                  </li>
                </ul>
              )}
              {currentStep === 2 && (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="font-bold">1.</span> Install Freighter wallet extension
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">2.</span> Import your account with secret key
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">3.</span> Return here and connect
                  </li>
                </ul>
              )}
              {currentStep >= 3 && (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="font-bold">✓</span> You&apos;re all set!
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">Next:</span> Browse vaults and start earning
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={completeOnboarding}
            className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            Skip tour
          </button>

          <div className="flex gap-3">
            {step.link && (
              <a
                href={step.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                {step.action}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {!step.link && (
              <button
                onClick={() => markStepCompleted(step.id)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                {step.action}
              </button>
            )}
            <button
              onClick={handleNextStep}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              {currentStep === steps.length - 1 ? "Complete" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
