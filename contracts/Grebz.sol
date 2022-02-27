// SPDX-License-Identifier: MIT

/*
 _______  _______  _______  _______   ______
(  ____ \(  ____ )(  ____ \(  ___  ) ( ___  )
| (    \/| (    )|| (    \/| (   ) | \/  / /
| |  __  | (____)|| (__    | (___) )    / /
| | |_ \ |     __)|  __)   |  ____  )  / /
| |   \ \| (\ (   | (      | (    ) | / /
| (___) || ) \ \__| (____/\| (____) |/ /___/\ 
(_______)|/   \__/(_______/(________)\______)

*/

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract Grebz is ERC721Enumerable, Ownable {
  using Strings for uint256;

  // Supplies
  uint256 public constant MAX_SUPPLY = 5555;
  uint256 public constant PRESALE_SUPPLY = 1000;
  uint256 public giveawaySupply = 40;

  // Prices
  uint256 public constant PRESALE_PRICE = 0.04 ether;
  uint256 public constant PUBLIC_PRICE = 0.07 ether;

  // Sale markers
  bool public presaleOpen = false;
  bool public publicSaleOpen = false;

  // Metadata
  string public baseTokenURI;
  string public placeholderURI;
  string public constant BASE_EXTENSION = ".json";
  bool public isFinalized = false;

  // Presale
  uint256 public constant MAX_PRESALE_MINT = 2;
  bytes32 public _presaleMerkleRoot;
  mapping(address => uint256) public _presaleWallets;

  // Max tx
  uint256 public constant MAX_PER_TX = 20;

  constructor(string memory _placeholderURI) ERC721("Grebz", "GREBZ") {
    placeholderURI = _placeholderURI;
  }

  /* ****************** */
  /*   MINT FUNCTIONS   */
  /* ****************** */

  function presaleMint(uint256 quantity, bytes32[] calldata merkleProof) external payable {
    require(presaleOpen, "Pre-sale is not open");
    require(quantity > 0, "quantity of tokens cannot be less than or equal to 0");
    bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
    require(
      MerkleProof.verify(merkleProof, _presaleMerkleRoot, leaf),
      "Invalid Merkle proof"
    );
    require(quantity <= MAX_PRESALE_MINT - _presaleWallets[msg.sender], "exceeded max per wallet");
    require(totalSupply() + quantity <= PRESALE_SUPPLY, "exceeded presale supply");
    require(totalSupply() + quantity <= MAX_SUPPLY - giveawaySupply, "exceed max supply of tokens");
    require(msg.value >= PRESALE_PRICE * quantity, "insufficient ether value");

    _presaleWallets[msg.sender] += quantity;
    for (uint256 i = 0; i < quantity; i++) {
      _safeMint(msg.sender, totalSupply());
    }
  }

  function publicMint(uint256 quantity) external payable {
    require(publicSaleOpen, "Public Sale is not open");
    require(quantity > 0, "quantity of tokens cannot be less than or equal to 0");
    require(quantity <= MAX_PER_TX, "exceed max per transaction");
    require(totalSupply() + quantity <= MAX_SUPPLY - giveawaySupply, "exceed max supply of tokens");
    require(msg.value >= PUBLIC_PRICE * quantity, "insufficient ether value");

    for (uint256 i = 0; i < quantity; i++) {
      _safeMint(msg.sender, totalSupply());
    }
  }

  /* ****************** */
  /* METADATA FUNCTIONS */
  /* ****************** */

  function _baseURI() internal view override(ERC721) returns (string memory) {
    return baseTokenURI;
  }

  function tokenURI(uint256 tokenID) public view virtual override returns (string memory) {
    require(_exists(tokenID), "ERC721Metadata: URI query for nonexistent token");
        
    if (!isFinalized) {
      return placeholderURI;   
    }

    string memory base = _baseURI();
    require(bytes(base).length > 0, "baseURI not set");
    return string(abi.encodePacked(base, tokenID.toString(), BASE_EXTENSION));
  }

  /* *************** */
  /* OWNER FUNCTIONS */
  /* *************** */

  //For marketing etc.
  function giveAway(address to, uint256 quantity) external onlyOwner {
    require(quantity <= giveawaySupply);
    
    giveawaySupply -= quantity;
    for (uint256 i = 0; i < quantity; i++) {
      _safeMint(to, totalSupply());
    }
  }

  // Metadata management
  function setPlaceholderURI(string calldata _placeholderURI) external onlyOwner {
    placeholderURI = _placeholderURI;
  }

  function setBaseURI(string calldata baseURI) external onlyOwner {
    require(!isFinalized, "Metadata is finalized");
    
    baseTokenURI = baseURI;
  }

  function finalize() external onlyOwner {
    isFinalized = true;
  }

  // Pre-sale management
  function setPresaleMerkleRoot(bytes32 root) external onlyOwner {
     _presaleMerkleRoot = root;
  }

  function togglePresale() external onlyOwner {
    presaleOpen = !presaleOpen;
  }

  // Public sale management
  function togglePublicSale() external onlyOwner {
    publicSaleOpen = !publicSaleOpen;
  }

  //Withdraw all
  function withdraw() public onlyOwner {
    uint256 balance = address(this).balance;
    payable(msg.sender).transfer(balance);
  }
}
