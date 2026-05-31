const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GoalStaker", function () {
  let goalStaker;
  let staker, verifier, forfeitTo, stranger;
  const STAKE = ethers.parseEther("0.01");

  // A deadline one week out, in unix seconds.
  async function weekFromNow() {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    return now + 7 * 24 * 60 * 60;
  }

  beforeEach(async function () {
    [staker, verifier, forfeitTo, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GoalStaker");
    goalStaker = await Factory.deploy();
    await goalStaker.waitForDeployment();
  });

  async function createDefaultGoal() {
    const deadline = await weekFromNow();
    const tx = await goalStaker
      .connect(staker)
      .createGoal(verifier.address, forfeitTo.address, deadline, "Ship v2", {
        value: STAKE,
      });
    await tx.wait();
    return 0; // first goalId
  }

  describe("createGoal", function () {
    it("locks the stake and stores the goal", async function () {
      const id = await createDefaultGoal();
      const goal = await goalStaker.getGoal(id);
      expect(goal.staker).to.equal(staker.address);
      expect(goal.verifier).to.equal(verifier.address);
      expect(goal.amount).to.equal(STAKE);
      expect(goal.status).to.equal(0); // Active
    });

    it("indexes goals by staker", async function () {
      await createDefaultGoal();
      const ids = await goalStaker.goalsOf(staker.address);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal(0n);
    });

    it("reverts on zero stake", async function () {
      const deadline = await weekFromNow();
      await expect(
        goalStaker
          .connect(staker)
          .createGoal(verifier.address, forfeitTo.address, deadline, "x", {
            value: 0,
          })
      ).to.be.revertedWithCustomError(goalStaker, "InvalidStake");
    });

    it("reverts on a past deadline", async function () {
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      await expect(
        goalStaker
          .connect(staker)
          .createGoal(verifier.address, forfeitTo.address, now - 1, "x", {
            value: STAKE,
          })
      ).to.be.revertedWithCustomError(goalStaker, "InvalidDeadline");
    });

    it("reverts if verifier is the staker or zero", async function () {
      const deadline = await weekFromNow();
      await expect(
        goalStaker
          .connect(staker)
          .createGoal(staker.address, forfeitTo.address, deadline, "x", {
            value: STAKE,
          })
      ).to.be.revertedWithCustomError(goalStaker, "InvalidVerifier");
    });

    it("reverts on empty description", async function () {
      const deadline = await weekFromNow();
      await expect(
        goalStaker
          .connect(staker)
          .createGoal(verifier.address, forfeitTo.address, deadline, "", {
            value: STAKE,
          })
      ).to.be.revertedWithCustomError(goalStaker, "EmptyDescription");
    });
  });

  describe("verify", function () {
    it("returns the stake to the staker", async function () {
      const id = await createDefaultGoal();
      await expect(
        goalStaker.connect(verifier).verify(id)
      ).to.changeEtherBalance(staker, STAKE);
      const goal = await goalStaker.getGoal(id);
      expect(goal.status).to.equal(1); // Succeeded
    });

    it("reverts if caller is not the verifier", async function () {
      const id = await createDefaultGoal();
      await expect(
        goalStaker.connect(stranger).verify(id)
      ).to.be.revertedWithCustomError(goalStaker, "NotVerifier");
    });

    it("reverts if the goal is not active", async function () {
      const id = await createDefaultGoal();
      await goalStaker.connect(verifier).verify(id);
      await expect(
        goalStaker.connect(verifier).verify(id)
      ).to.be.revertedWithCustomError(goalStaker, "GoalNotActive");
    });
  });

  describe("markFailed", function () {
    it("sends the stake to the forfeit address", async function () {
      const id = await createDefaultGoal();
      await expect(
        goalStaker.connect(verifier).markFailed(id)
      ).to.changeEtherBalance(forfeitTo, STAKE);
      const goal = await goalStaker.getGoal(id);
      expect(goal.status).to.equal(2); // Failed
    });

    it("reverts if caller is not the verifier", async function () {
      const id = await createDefaultGoal();
      await expect(
        goalStaker.connect(stranger).markFailed(id)
      ).to.be.revertedWithCustomError(goalStaker, "NotVerifier");
    });
  });

  describe("cancelEarly", function () {
    it("refunds the staker within the window", async function () {
      const id = await createDefaultGoal();
      await expect(
        goalStaker.connect(staker).cancelEarly(id)
      ).to.changeEtherBalance(staker, STAKE);
      const goal = await goalStaker.getGoal(id);
      expect(goal.status).to.equal(3); // Cancelled
    });

    it("reverts if a non-staker tries to cancel", async function () {
      const id = await createDefaultGoal();
      await expect(
        goalStaker.connect(stranger).cancelEarly(id)
      ).to.be.revertedWithCustomError(goalStaker, "NotStaker");
    });

    it("reverts after the 10-minute window", async function () {
      const id = await createDefaultGoal();
      await ethers.provider.send("evm_increaseTime", [11 * 60]);
      await ethers.provider.send("evm_mine", []);
      await expect(
        goalStaker.connect(staker).cancelEarly(id)
      ).to.be.revertedWithCustomError(goalStaker, "DeadlinePassed");
    });
  });

  describe("resolveAfterGrace", function () {
    it("reverts before the grace period elapses", async function () {
      const id = await createDefaultGoal();
      await expect(
        goalStaker.connect(stranger).resolveAfterGrace(id)
      ).to.be.revertedWithCustomError(goalStaker, "GraceNotElapsed");
    });

    it("lets anyone send the stake to forfeitTo after deadline + grace", async function () {
      const id = await createDefaultGoal();
      // Jump past deadline (7 days) + grace (14 days) + buffer.
      await ethers.provider.send("evm_increaseTime", [22 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      await expect(
        goalStaker.connect(stranger).resolveAfterGrace(id)
      ).to.changeEtherBalance(forfeitTo, STAKE);
      const goal = await goalStaker.getGoal(id);
      expect(goal.status).to.equal(2); // Failed
    });
  });
});
