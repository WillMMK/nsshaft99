sendAttack(targetId: string, attackType: AttackType) {
  const targetName = this.getPlayerName(targetId);
  console.log('Sending attack:', { targetId, targetName, attackType });
  
  this.networkManager.sendAttack(targetId, attackType);
  
  // Update game state to show attack was sent
  this.updateGameState({
    lastAttackSent: {
      type: attackType,
      targetId: targetId,
      targetName: targetName,
      timestamp: Date.now()
    }
  });
  
  console.log('Updated game state with lastAttackSent:', {
    type: attackType,
    targetId: targetId,
    targetName: targetName
  });
} 