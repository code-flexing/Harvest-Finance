"use client";

import React, { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Section,
  Stack,
  Textarea,
} from "@/components/ui";
import { signTransactionWithFreighter } from "@/lib/freighter/signSorobanTransaction";
import { parseStellarError } from "@/lib/errors/stellar-errors";
import { Code2, Shield, Wallet, Zap, CheckCircle2 } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";
import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
  Account,
} from "@stellar/stellar-sdk";
import { getAddress } from "@stellar/freighter-api";

export default function SorobanSigningDemoPage() {
  const { showToast } = useToastStore();

  const [transactionXdr, setTransactionXdr] = useState("");
  const [networkPassphrase, setNetworkPassphrase] = useState("");
  const [signedTxXdr, setSignedTxXdr] = useState("");
  const [signerAddress, setSignerAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  // XDR generator state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedOk, setGeneratedOk] = useState(false);

  const canSign = useMemo(
    () => transactionXdr.trim().length > 0 && !isSigning,
    [transactionXdr, isSigning],
  );

  // ── XDR Generator ─────────────────────────────────────────────────────────
  const handleGenerateXdr = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedOk(false);

    try {
      // 1. Get public key from Freighter
      const addrObj = await getAddress();
      if (addrObj.error || !addrObj.address) {
        throw new Error(
          "Could not get address from Freighter. Make sure it's connected.",
        );
      }
      const publicKey = addrObj.address;

      // 2. Fetch account sequence number from Horizon Testnet
      const horizonRes = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${publicKey}`,
      );

      if (!horizonRes.ok) {
        if (horizonRes.status === 404) {
          throw new Error(
            `Account not funded on Testnet. Visit: https://friendbot.stellar.org/?addr=${publicKey}`,
          );
        }
        throw new Error(`Horizon error: ${horizonRes.status}`);
      }

      const accountData = await horizonRes.json();

      // 3. Build a simple XLM payment-to-self transaction
      const account = new Account(publicKey, accountData.sequence);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: publicKey, // pay yourself — safe for testing
            asset: Asset.native(),
            amount: "0.0000001",
          }),
        )
        .setTimeout(300)
        .build();

      // 4. Set XDR into the textarea
      setTransactionXdr(tx.toXDR());
      setNetworkPassphrase(""); // let the lib auto-detect from Freighter
      setGeneratedOk(true);
      showToast("Test XDR generated — ready to sign!", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate XDR";
      setGenerateError(msg);
      showToast(msg, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Sign handler ──────────────────────────────────────────────────────────
  const handleSign = async () => {
    setError(null);
    setSignedTxXdr("");
    setSignerAddress("");

    if (!transactionXdr.trim()) {
      setError("Please paste an unsigned Soroban transaction XDR first.");
      return;
    }

    try {
      setIsSigning(true);
      const res = await signTransactionWithFreighter({
        transactionXdr: transactionXdr.trim(),
        networkPassphrase: networkPassphrase.trim()
          ? networkPassphrase.trim()
          : undefined,
      });

      setSignedTxXdr(res.signedTxXdr);
      setSignerAddress(res.signerAddress);
      showToast("Transaction signed with Freighter", "success");
    } catch (e) {
      const parsed = parseStellarError(e);
      setError(parsed.message);
      showToast(parsed.message, "error");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <Section paddingY="lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="primary" className="mb-3">
              Freighter • Soroban Signing Demo
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-4xl">
              Sign Soroban transactions directly
            </h1>
            <p className="mt-2 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              Paste an{" "}
              <span className="font-mono">unsigned transactionXdr</span>, then
              sign it using the Freighter extension. This page is meant for
              integration verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-harvest-green-50 border border-harvest-green-100">
              <Wallet className="h-5 w-5 text-harvest-green-700" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Wallet
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Freighter extension
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Quick Test XDR Generator ── */}
      <Card
        variant="default"
        className="border-dashed border-harvest-green-200 bg-harvest-green-50/30 dark:bg-harvest-green-900/10"
      >
        <CardHeader
          title="Quick Test — Generate a sample XDR"
          subtitle="Generates a tiny XLM payment-to-self on Testnet using your connected Freighter account. No funds leave your wallet."
          action={<Badge variant="success">Testnet only</Badge>}
        />
        <CardBody>
          <Stack gap="md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                variant="secondary"
                onClick={handleGenerateXdr}
                isLoading={isGenerating}
                leftIcon={<Zap className="w-4 h-4" />}
                disabled={isGenerating}
              >
                {isGenerating
                  ? "Generating…"
                  : "Generate test XDR from Freighter account"}
              </Button>

              {generatedOk && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-harvest-green-700 dark:text-harvest-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  XDR generated — scroll down and sign it!
                </span>
              )}
            </div>

            {generateError && (
              <Alert
                variant="error"
                description={generateError}
                isClosable
                onClose={() => setGenerateError(null)}
              />
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Requirements: Freighter installed &amp; connected, account funded
              on{" "}
              <a
                href="https://friendbot.stellar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700"
              >
                Testnet via Friendbot
              </a>
              .
            </p>
          </Stack>
        </CardBody>
      </Card>

      {/* ── Main signing cards ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card variant="default">
          <CardHeader
            title="1) Unsigned transaction XDR"
            subtitle="Provide transactionXdr (base64 XDR envelope) that Freighter should sign."
            action={<Badge variant="success">XDR input</Badge>}
          />
          <CardBody>
            <Stack gap="md">
              <Textarea
                label="transactionXdr (paste here or generate above)"
                placeholder="e.g. AAAA... (unsigned transaction XDR)"
                value={transactionXdr}
                onChange={(e) => {
                  setTransactionXdr(e.target.value);
                  setGeneratedOk(false);
                }}
                rows={10}
              />

              <Input
                label="networkPassphrase (optional)"
                placeholder="Leave empty to use Freighter default"
                value={networkPassphrase}
                onChange={(e) => setNetworkPassphrase(e.target.value)}
                type="text"
              />

              {error && (
                <Alert
                  variant="error"
                  description={error}
                  isClosable
                  onClose={() => setError(null)}
                />
              )}

              <Button
                variant="primary"
                onClick={handleSign}
                isLoading={isSigning}
                leftIcon={<Shield className="w-4 h-4" />}
                disabled={!canSign}
              >
                Sign with Freighter
              </Button>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                If Freighter is not installed or the user rejects signing,
                you&apos;ll see an error here.
              </p>
            </Stack>
          </CardBody>
        </Card>

        <Card variant="outlined">
          <CardHeader
            title="2) Signed output"
            subtitle="Freighter returns signedTxXdr and signer address."
            action={<Badge variant="info">Output</Badge>}
          />
          <CardBody>
            <Stack gap="md">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    Signer
                  </span>
                  <span className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {signerAddress || "—"}
                  </span>
                </div>
              </div>

              <Textarea
                label="signedTxXdr (read-only)"
                value={signedTxXdr}
                onChange={() => {}}
                placeholder={`No signed XDR yet — click "Sign with Freighter".`}
                rows={10}
                readOnly
              />

              <Button
                variant="ghost"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(signedTxXdr)
                    .then(() => showToast("Signed XDR copied", "success"))
                    .catch(() =>
                      showToast("Failed to copy signed XDR", "error"),
                    );
                }}
                disabled={!signedTxXdr}
              >
                Copy signedTxXdr
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
