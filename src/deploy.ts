import { config } from 'dotenv';
import * as fs from 'fs';
import { AccountData, DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient, UploadResult } from '@cosmjs/cosmwasm-stargate';
import { CW20 } from './cw20-base-helpers';

config();

const { ERC20_CONTRACT, DORIUM_PROPOSAL_CONTRACT, MNEMONIC_MAIN, RPC_ENDPOINT } = process.env;
const options = { prefix: "wasm" };
const ERC20Contract = fs.readFileSync(ERC20_CONTRACT)
const ProposalContract = fs.readFileSync(DORIUM_PROPOSAL_CONTRACT);

async function getWalletData() {
	return await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC_MAIN, options);
}

async function getWalletAccount() {
	const walletData = await getWalletData();
	const [mainAccount] = await walletData.getAccounts();

	return mainAccount;
}

async function uploadContracts(account: AccountData, wallet: DirectSecp256k1HdWallet, client: SigningCosmWasmClient) {
	const con_cw20 = await client.upload(account.address, ERC20Contract);
	console.log("CW20 Uploaded Contract", con_cw20);
	const con_dorcp = await client.upload(account.address, ProposalContract);
	console.log("DORCP Uploaded Contract", con_dorcp);
	var contracts = {
		cw20: {codeId: con_cw20.codeId, transactionHash: con_cw20.transactionHash},
		dorcp: {codeId: con_dorcp.codeId, transactionHash: con_dorcp.transactionHash},
	}
	return contracts
}
async function instantiateCW20(contractData: UploadResult, account: AccountData, wallet: DirectSecp256k1HdWallet, client: SigningCosmWasmClient) {
	const initMsg = {
		name: 'Dorium Value Token',
		symbol: 'TREE',
		decimals: 2,
		initial_balances: [
			{ address: 'wasm1ryuawewrukex42yh2kpydtpdh90ex096kaajek', amount: '3040000000000' }, // number of trees in the world according to Google
		],
		mint: {
			minter: 'wasm1ryuawewrukex42yh2kpydtpdh90ex096kaajek',
		},
	};

	const instanceData = await client.instantiate(account.address, contractData.codeId, initMsg, "instantiating the DORCP contract");
	return instanceData
}

async function instantiateDoriumCommunityProposal(contractData: UploadResult, account: AccountData, wallet: DirectSecp256k1HdWallet, client: SigningCosmWasmClient) {
	const instantiateData = await client.instantiate(
		account.address,
		contractData.codeId,
		{},
		'creating the cw20 token'
	);
	return instantiateData
}

export async function main() {
	try {
		const account = await getWalletAccount();
		const wallet = await getWalletData();
		const client = await SigningCosmWasmClient.connectWithSigner(RPC_ENDPOINT, wallet, options);

		// const contracts = uploadContracts(account, wallet, client);
		// fs.writeFileSync("contracts.json", JSON.stringify(contracts))

		var con = JSON.parse(fs.readFileSync("contracts.json").toString());
		const inst_cw20 = await instantiateCW20(con.cw20, account, wallet, client);
		console.log("CW20 Instantiated", inst_cw20);
		const inst_dorcp = await instantiateDoriumCommunityProposal(con.dorcp, account, wallet, client);
		console.log("DORCP Instantiated", inst_dorcp);
	} catch (e) {
		throw e;
	}
}
