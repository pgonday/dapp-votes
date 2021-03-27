const { BN, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const Voting = artifacts.require("Voting");


contract("Voting", accounts => {

  const owner = accounts[0];
  const addr1 = accounts[1];
  const addr2 = accounts[2];

  const wfsRegisteringVoters = new BN(0);
  const wfsProposalsRegistrationStarted = new BN(1);
  const wfsProposalsRegistrationEnded = new BN(2);
  const wfsVotingSessionStarted = new BN(3);
  const wfsVotingSessionEnded = new BN(4);
  const wfsVotesTallied = new BN(5);

  const errOwnableOwner = "Ownable: caller is not the owner";
  const errAlreadyRegistered = "Already registered";
  const errNotRegistered = "You are not registered.";

  const errWFRegisteringVoters = "WorkflowStatus must be RegisteringVoters to call this function.";
  const errWFProposalsRegistrationStarted = "WorkflowStatus must be ProposalsRegistrationStarted to call this function.";
  const errWFProposalsRegistrationEnded = "WorkflowStatus must be ProposalsRegistrationEnded to call this function.";
  const errWFVotingSessionStarted = "WorkflowStatus must be VotingSessionStarted to call this function.";
  const errWFVotingSessionEnded = "WorkflowStatus must be VotingSessionEnded to call this function.";

  beforeEach(async () => {
    this.VotingInstance = await Voting.new();
  });


  it("initial workflow status is registering voters", async () => {
    let status = await this.VotingInstance.workflowStatus.call();

    expect(status).to.be.bignumber.equal(wfsRegisteringVoters);
  });


  it ("only owner can change workflow status", async () => {
    await expectRevert(this.VotingInstance.startProposalsRegistration({from: addr1}), errOwnableOwner);
    await expectRevert(this.VotingInstance.closeProposalsRegistration({from: addr1}), errOwnableOwner);
    await expectRevert(this.VotingInstance.startVotingSession({from: addr1}), errOwnableOwner);
    await expectRevert(this.VotingInstance.closeVotingSession({from: addr1}), errOwnableOwner);
    await expectRevert(this.VotingInstance.tallyVotes({from: addr1}), errOwnableOwner);

    await this.VotingInstance.startProposalsRegistration({from: owner});
  });


  it("only owner can add address to whitelist", async () => {
    await expectRevert(this.VotingInstance.addToWhitelist(owner, {from: addr1}), errOwnableOwner);
    await expectRevert(this.VotingInstance.addToWhitelist(owner, {from: addr2}), errOwnableOwner);
    await this.VotingInstance.addToWhitelist(owner, {from: owner});

    let wlist = await this.VotingInstance.getWhitelist();
    expect(wlist.length).to.be.equal(1);
    expect(wlist[0]).to.be.equal(owner);
  });


  it("only register once", async () => {
    await this.VotingInstance.addToWhitelist(owner, {from: owner});
    await expectRevert(this.VotingInstance.addToWhitelist(owner, {from: owner}), errAlreadyRegistered);
  });


  it("register users", async () => {
    await this.VotingInstance.addToWhitelist(owner, {from: owner});
    await this.VotingInstance.addToWhitelist(addr1, {from: owner});

    let wlist = await this.VotingInstance.getWhitelist();
    expect(wlist.length).to.be.equal(2);
    expect(wlist[0]).to.be.equal(owner);
    expect(wlist[1]).to.be.equal(addr1);
  });


  it ('only registered users can add proposal', async () => {
    await this.VotingInstance.addToWhitelist(addr1, {from: owner});

    await this.VotingInstance.startProposalsRegistration({from: owner});

    await expectRevert(this.VotingInstance.propose('Proposal 1', { from: addr2 }), errNotRegistered);
    await this.VotingInstance.propose('Proposal 1', { from: addr1 });

    let proposals = await this.VotingInstance.getProposals();
    expect(proposals.length).to.be.equal(1);
    expect(proposals[0]).to.be.equal('Proposal 1');
  });

  
});
