// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CollectionERC721A is ERC721A, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public maxSupply = 50;
    uint256 public mintingPrice = 0.01 ether;
    string private _baseTokenURI = "";

    bytes32 public merkleRoot;
    mapping(address => bool) public usersClaimed;

    bool public mintingPaused = false;

    event Minted(address indexed to, uint256 indexed tokenId);
    event BatchMinted(
        address indexed to,
        uint256 indexed tokenIdFirst,
        uint256 indexed tokenIdLast
    );
    event MintingPriceUpdated(uint256 newPrice);
    event MaxSupplyUpdated(uint256 newSupply);
    event MintingPaused(bool paused);
    event AdminChanged(address indexed newAdmin);
    event CryptoWithdrawn(uint256 amount);

    constructor() Ownable(msg.sender) ERC721A("Pandas Roly-Poly", "PRP") {}

    modifier mintingNotPaused() {
        require(!mintingPaused, "Minting is paused");
        _;
    }

    modifier belowMaxSupply(uint256 count) {
        require(totalSupply() + count <= maxSupply, "You reached max supply");
        _;
    }

    function setRoot(bytes32 _root) external onlyOwner {
        merkleRoot = _root;
    }

    function mint() external payable mintingNotPaused belowMaxSupply(1) {
        require(msg.value == mintingPrice, "Incorrect price");

        uint256 nextTokenId = _nextTokenId();
        _safeMint(msg.sender, 1);

        emit Minted(msg.sender, nextTokenId);
    }

    function freeMint(
        bytes32[] calldata _proof
    ) external mintingNotPaused belowMaxSupply(1) {
        require(
            MerkleProof.verify(
                _proof,
                merkleRoot,
                keccak256(abi.encodePacked(msg.sender))
            ),
            "You are not whitelisted."
        );

        uint256 nextTokenId = _nextTokenId();
        _safeMint(msg.sender, 1);

        emit Minted(msg.sender, nextTokenId);
    }

    function adminMint(
        address to,
        uint256 count
    ) external onlyOwner belowMaxSupply(count) {
        uint256 firstTokenId = _nextTokenId();
        _safeMint(to, count);
        uint256 lastTokenId = _nextTokenId() - 1;

        emit BatchMinted(to, firstTokenId, lastTokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory base = _baseTokenURI;
        return
            bytes(base).length > 0
                ? string(abi.encodePacked(base, tokenId.toString(), ".json"))
                : "";
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function updateMintingPrice(uint256 _newPrice) external onlyOwner {
        mintingPrice = _newPrice;
        emit MintingPriceUpdated(_newPrice);
    }

    function updateMaxSupply(uint256 _newSupply) external onlyOwner {
        maxSupply = _newSupply;
        emit MaxSupplyUpdated(_newSupply);
    }

    function pauseMinting() external onlyOwner {
        mintingPaused = true;
        emit MintingPaused(true);
    }

    function resumeMinting() external onlyOwner {
        mintingPaused = false;
        emit MintingPaused(false);
    }

    function changeAdmin(address _newAdmin) external onlyOwner {
        transferOwnership(_newAdmin);
        emit AdminChanged(_newAdmin);
    }

    function withdrawCrypto(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(_amount);
        emit CryptoWithdrawn(_amount);
    }
}
