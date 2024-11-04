// noinspection DuplicatedCode

import {
  createPublicClient,
  http,
  createWalletClient,
  formatEther,
  hexToString,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import * as dotenv from "dotenv";
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";

const PROPOSAL_NAME_IDX = 0;

async function main() {
  // Fetch parameters
  const ARG_PROPOSAL_NO_IDX = 0;
  const ARG_CONTRACT_ADDRESS_IDX = 1;
  const parameters = process.argv.slice(2);
  const proposalIndex = parameters[ARG_PROPOSAL_NO_IDX];
  const contractAddress =
    (parameters[ARG_CONTRACT_ADDRESS_IDX] as `0x${string}`)

  if (!parameters || parameters.length < 1)
    throw new Error(
      "Parameters not provided. You must at least provide the proposal ID.",
    );

  if (isNaN(Number(proposalIndex))) throw new Error("Invalid proposal index");

  if (!contractAddress)
    throw new Error(
      "Contract address not provided. Either set this in your environment variables, or provide it in the arguments.",
    );

  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
    throw new Error("Invalid contract address provided.");

  console.log(
    "scripts -> CastVote -> contract",
    contractAddress,
    "proposal",
    proposalIndex,
  );

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> CastVote -> last block number", blockNumber);

  // Create a wallet client
  const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  console.log(
    "scripts -> CastVote -> deployer address",
    walletClient.account.address,
  );
  const balance = await publicClient.getBalance({
    address: walletClient.account.address,
  });
  console.log(
    "scripts -> CastVote -> deployer balance",
    formatEther(balance),
    walletClient.chain.nativeCurrency.symbol,
  );

  const proposal = (await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "proposals",
    args: [BigInt(proposalIndex!)],
  })) as any[];
  const name = hexToString(proposal[PROPOSAL_NAME_IDX], { size: 32 });
  console.log("scripts -> CastVote -> Voting to proposal", name);
  console.log("scripts -> CastVote -> Confirm? (Y/n)");

  const stdin = process.stdin;
  // Set encoding to handle string input
  stdin.setEncoding("utf8");
  stdin.on("data", async function (d) {
    if (d.toString().trim().toLowerCase() != "n") {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi,
        functionName: "vote",
        args: [BigInt(proposalIndex!)],
      });
      console.log(
        "scripts -> CastVote -> transaction hash",
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
        console.log("scripts -> CastVote -> transaction succeeded");
      } else {
        console.error("scripts -> CastVote -> transaction failed");
      }
    } else {
      console.log("scripts -> CastVote -> operation cancelled");
    }

    process.exit();
  });
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
