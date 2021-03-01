// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.11;
 
import "@openzeppelin/contracts/access/Ownable.sol";

 
contract Voting is Ownable {

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }
    
    
    Proposal[] proposals;
    mapping(address => Voter) voters;
    
    // I assume that we have only one winner and can't have draw...
    uint private maxVoteCount = 0;
    uint private winningProposalId;
    
    WorkflowStatus workflowStatus = WorkflowStatus.RegisteringVoters;
    

    event VoterRegistered(address voterAddress);
    event ProposalsRegistrationStarted();
    event ProposalsRegistrationEnded();
    event ProposalRegistered(uint proposalId);
    event VotingSessionStarted();
    event VotingSessionEnded();
    event Voted (address voter, uint proposalId);
    event VotesTallied();
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    

    // ---------- Administrator only functions -----------
    
    function addToWhitelist(address _address) public onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "WorkflowStatus must be RegisteringVoters to call this function.");
        require(!voters[_address].isRegistered, "Already registered");

        voters[_address].isRegistered = true;
        
        emit VoterRegistered(_address);
    }
    
    
    function startProposalsRegistration() public onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "WorkflowStatus must be RegisteringVoters to call this function.");
        
        changeStatus(WorkflowStatus.ProposalsRegistrationStarted);        
        emit ProposalsRegistrationStarted();
    }
    
    
    function closeProposalsRegistration() public onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "WorkflowStatus must be ProposalsRegistrationStarted to call this function.");
        
        changeStatus(WorkflowStatus.ProposalsRegistrationEnded);
        emit ProposalsRegistrationEnded();
    }
    
    
    function startVotingSession() public onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, "WorkflowStatus must be ProposalsRegistrationEnded to call this function.");
        
        changeStatus(WorkflowStatus.VotingSessionStarted);
        emit VotingSessionStarted();
    }
    
    
    function closeVotingSession() public onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "WorkflowStatus must be VotingSessionStarted to call this function.");
        
        changeStatus(WorkflowStatus.VotingSessionEnded);
        emit VotingSessionEnded();
    }
    
    
    function tallyVotes() public onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "WorkflowStatus must be VotingSessionEnded to call this function.");
        
        // winning proposal already known, tracked in "vote" function.
        
        changeStatus(WorkflowStatus.VotesTallied);
        emit VotesTallied();
    }
    

    function changeStatus(WorkflowStatus _status) internal onlyOwner {
      emit WorkflowStatusChange(workflowStatus, _status);
      workflowStatus = _status;
    }


    function getStatus() external view returns (WorkflowStatus) {
        return workflowStatus;
    }


    // ---------- Electors functions ----------
    
    function propose(string memory _description) public {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "Proposal registration is not started or is closeed.");
        require(isWhitelisted(msg.sender), "You are not registered.");
        
        proposals.push(Proposal(_description, 0));
        
        emit ProposalRegistered(proposals.length - 1);
    }
    
    
    function vote(uint _proposalId) public {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Voting session is not started.");
        require(isWhitelisted(msg.sender), "You are not registered.");
        require(_proposalId < proposals.length, "Unknown proposalId");

        require(!voters[msg.sender].hasVoted, "You have already voted.");
        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _proposalId;
        
        proposals[_proposalId].voteCount ++;
        
        // We track the winning proposal here, so we don't have to do a loop on votes later.
        // But this works only if there is a single winner (no draw), otherwise the first with higher votes is the winner.
        if (proposals[_proposalId].voteCount > maxVoteCount) {
            maxVoteCount = proposals[_proposalId].voteCount;
            winningProposalId = _proposalId;
        }
        
        emit Voted(msg.sender, _proposalId);
    }
    
    
    function isWhitelisted(address _address) public view returns (bool) {
        return voters[_address].isRegistered;
    }
    

    function getWinningProposal() public view returns (uint _proposalId, string memory _description, uint _voteCount) {
        require(workflowStatus == WorkflowStatus.VotesTallied, "Voting session is not ended.");
        
        Proposal memory proposal = proposals[winningProposalId];
        
        return (winningProposalId, proposal.description, proposal.voteCount);
    }

} 
