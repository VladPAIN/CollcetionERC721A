import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, SignerWithAddress } from "ethers";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";

describe("CollectionERC721A", function () {
  let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addr4: SignerWithAddress, addr5: SignerWithAddress;
  let nftContract: Contract;

  let Tree: MerkleTree;
  let RootTree: string;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("CollectionERC721A");
    nftContract = await NFT.connect(owner).deploy();

    let whitelist = [
      addr1.address, addr2.address,
      addr3.address, addr4.address
    ];
    const leafs = whitelist.map(address => ethers.keccak256(address));
    Tree = new MerkleTree(leafs, ethers.keccak256, { sortPairs: true });
    RootTree = Tree.getHexRoot();


  });

  it("Mint", async function () {
    await expect(nftContract.connect(addr1).mint({ value: ethers.parseEther("0.01") }))
      .to.emit(nftContract, "Minted");

    await expect(nftContract.connect(addr1).mint({ value: ethers.parseEther("0.1") })).to.be.revertedWith('Incorrect price');

    const finalBalance = await nftContract.balanceOf(await addr1.getAddress());

    expect(finalBalance).to.equal(1);
  });

  it("FreeMint", async function () {
    await nftContract.connect(owner).setRoot(RootTree);

    const claimingAddress = Tree.getLeaf(3);
    const hexProof = Tree.getHexProof(claimingAddress);

    await nftContract.connect(addr4).freeMint(hexProof);
    const finalBalance = await nftContract.balanceOf(await addr4.getAddress());

    expect(finalBalance).to.equal(1);

    await expect(nftContract.connect(addr5).freeMint(hexProof)).to.be.revertedWith('You are not whitelisted.');
  });

  it("AdminMint", async function () {
    await expect(nftContract.connect(owner).adminMint(addr1, 10)).to.emit(nftContract, "BatchMinted");

    const addr1balance = await nftContract.balanceOf(await addr1.getAddress());

    expect(addr1balance).to.equal(10);

    await expect(nftContract.connect(owner).adminMint(addr1, 41)).to.be.revertedWith('You reached max supply');

  });

  it("SetBaseURI", async function () {
    const baseuri = "ipfs://QmeRsttzmYHKyXQA6edTPSUaZNYX6Zmurc8a9jUh1GCpf1/";
    await nftContract.setBaseURI(baseuri);

    await expect(nftContract.connect(owner).adminMint(addr1, 10)).to.emit(nftContract, "BatchMinted");

    expect(await nftContract.tokenURI(1)).to.equal(baseuri + "1.json");

  });

  it("UpdateMintingPrice", async function () {
    await nftContract.connect(owner).updateMintingPrice(ethers.parseEther("1"));

    await expect(nftContract.connect(addr1).mint({ value: ethers.parseEther("1") }))
      .to.emit(nftContract, "Minted");

    await expect(nftContract.connect(addr1).mint({ value: ethers.parseEther("0.1") })).to.be.revertedWith('Incorrect price');

    const finalBalance = await nftContract.balanceOf(await addr1.getAddress());

    expect(finalBalance).to.equal(1);

  });

  it("UpdateMaxSupply", async function () {
    expect(await nftContract.maxSupply()).to.equal(50);

    await nftContract.connect(owner).updateMaxSupply(100);

    expect(await nftContract.maxSupply()).to.equal(100);

  });

  it("PauseMinting and ResumeMinting", async function () {
    await expect(nftContract.connect(addr1).mint({ value: ethers.parseEther("0.01") }))
      .to.emit(nftContract, "Minted");

    expect(await nftContract.balanceOf(await addr1.getAddress())).to.equal(1);

    await nftContract.connect(owner).pauseMinting();
    await expect(nftContract.connect(addr2).mint({ value: ethers.parseEther("0.01") })).to.be.revertedWith('Minting is paused');

    await nftContract.connect(owner).resumeMinting();
    await expect(nftContract.connect(addr1).mint({ value: ethers.parseEther("0.01") }))
      .to.emit(nftContract, "Minted");

    expect(await nftContract.balanceOf(await addr1.getAddress())).to.equal(2);

  });

  it("ChangeAdmin", async function () {
    await nftContract.connect(owner).changeAdmin(addr1.address);

    expect(await nftContract.owner()).to.equal(addr1.address);
  });

  it("WithdrawCrypto", async function () {

    await nftContract.connect(owner).updateMintingPrice(ethers.parseEther("1"));
    await expect(nftContract.connect(addr1).mint({ value: ethers.parseEther("1") }))
      .to.emit(nftContract, "Minted");

    await nftContract.connect(owner).withdrawCrypto(ethers.parseEther('1'));

    await expect(nftContract.connect(owner).withdrawCrypto(ethers.parseEther('2'))).to.be.revertedWith('Insufficient balance');
    const finalContractBalance = await ethers.provider.getBalance(nftContract.getAddress());

    expect(finalContractBalance).to.equal(0);
  });

});