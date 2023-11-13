async function main() {
  const MyNFTCollection = await ethers.getContractFactory("CollectionERC721A");
  const mynftcollection = await MyNFTCollection.deploy();
  console.log("Contract Deployed to Address:", mynftcollection.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });