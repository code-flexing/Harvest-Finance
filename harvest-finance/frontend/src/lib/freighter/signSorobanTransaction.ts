import {
  signTransaction,
  getAddress,
  isConnected,
  requestAccess,
  getNetworkDetails,
} from "@stellar/freighter-api";

export async function signTransactionWithFreighter(params: {
  transactionXdr: string;
  networkPassphrase?: string;
}): Promise<{ signedTxXdr: string; signerAddress: string }> {
  const connected = await isConnected();
  if (!connected.isConnected) {
    throw new Error(
      "Freighter wallet not found. Please install the extension.",
    );
  }

  // Always read the network Freighter is currently on
  const networkDetails = await getNetworkDetails();
  if (networkDetails.error) {
    throw new Error(
      networkDetails.error.message ?? "Could not get network from Freighter",
    );
  }

  // Get address, prompt if not yet allowed
  let address: string;
  const addrObj = await getAddress();

  if (addrObj.error || !addrObj.address) {
    const accessObj = await requestAccess();
    if (accessObj.error) {
      throw new Error(
        typeof accessObj.error === "string"
          ? accessObj.error
          : (accessObj.error.message ?? "User denied access"),
      );
    }
    address = accessObj.address;
  } else {
    address = addrObj.address;
  }

  // Use caller-supplied passphrase, or fall back to Freighter's active network
  const networkPassphrase =
    params.networkPassphrase?.trim() || networkDetails.networkPassphrase;

  const res = await signTransaction(params.transactionXdr, {
    networkPassphrase,
    address,
  });

  if (res.error) {
    throw new Error(
      typeof res.error === "string"
        ? res.error
        : (res.error.message ?? "Failed to sign transaction"),
    );
  }

  return {
    signedTxXdr: res.signedTxXdr,
    signerAddress: res.signerAddress ?? address,
  };
}
