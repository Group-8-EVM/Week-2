// noinspection DuplicatedCode

import {
  createPublicClient,
  http,
  createWalletClient,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import * as dotenv from "dotenv";
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";

async function main() {
  // Fetch parameters
  const ARG_TARGET_ADDRESS_IDX = 0;
  const ARG_CONTRACT_ADDRESS_IDX = 1;
  const parameters = process.argv.slice(2);
  const targetAddress = parameters[ARG_TARGET_ADDRESS_IDX] as `0x${string}`;
  const contractAddress = parameters[ARG_CONTRACT_ADDRESS_IDX] as `0x${string}`;

  if (!parameters || parameters.length < 1)
    throw new Error(
      "Parameters not provided. You must provide the target voter address and cantract address.",
    );

  if (!targetAddress) throw new Error("Target voter address not provided.");

  if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress))
    throw new Error("Invalid target voter address provided.");

  if (!contractAddress)
    throw new Error(
      "Contract address not provided. Either set this in your environment variables, or provide it in the arguments.",
    );

  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
    throw new Error("Invalid contract address provided.");

  console.log(
    "scripts -> GiveRightToVote -> contract",
    contractAddress,
    "targetAddress",
    targetAddress,
  );
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> GiveRightToVote -> last block number", blockNumber);

  // Create a wallet client
  const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  console.log(
    "scripts -> GiveRightToVote -> deployer address",
    walletClient.account.address,
  );
  const balance = await publicClient.getBalance({
    address: walletClient.account.address,
  });
  console.log(
    "scripts -> GiveRightToVote -> deployer balance",
    formatEther(balance),
    walletClient.chain.nativeCurrency.symbol,
  );

  // Validate that the contract write will execute without errors.
  const { request } = await publicClient.simulateContract({
    account,
    address: contractAddress,
    abi,
    functionName: "giveRightToVote",
    args: [targetAddress],
  });
  // console.log("scripts -> GiveRightToVote -> simulate -> request", request);
  // Execute the contract
  const hash = await walletClient.writeContract(request);
  console.log(
    "scripts -> GiveRightToVote -> transaction hash",
    hash,
    "waiting for confirmations...",
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const gasPrice = receipt.effectiveGasPrice
    ? formatEther(receipt.effectiveGasPrice)
    : "N/A";
  const gasUsed = receipt.gasUsed ? receipt.gasUsed.toString() : "N/A";
  const totalCost = receipt.effectiveGasPrice
    ? formatEther(receipt.effectiveGasPrice * receipt.gasUsed)
    : "N/A";
  console.log(
    "scripts -> GiveRightToVote -> transaction confirmed -> receipt",
    receipt.blockNumber,
  );
  console.log(
    "scripts -> GiveRightToVote -> gas -> price",
    gasPrice,
    "used",
    gasUsed,
    "totalCost",
    totalCost,
  );

  if (receipt.status === "success") {
    console.log("scripts -> GiveRightToVote -> transaction succeeded");
  } else {
    console.error("scripts -> GiveRightToVote -> transaction failed");
  }
}

main().catch((error) => {
  const message =
    error instanceof Error
      ? ("reason" in error && error.reason) || error.message
      : "";
  console.error("scripts -> failed with error ->", message);
  // console.log("\n\nError details:");
  // console.error(error);
  process.exitCode = 1;
});
