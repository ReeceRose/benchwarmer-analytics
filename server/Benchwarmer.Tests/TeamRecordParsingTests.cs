using Benchwarmer.Ingestion.Parsers;

namespace Benchwarmer.Tests;

public class TeamRecordParsingTests
{
    [Fact]
    public void Parse_TeamRecord_WithDuplicateTeamColumns_MapsCorrectly()
    {
        // Arrange - CSV with duplicate 'team' columns at indices 0 and 3
        var csv = """
            team,season,name,team,position,situation,games_played,xGoalsPercentage,corsiPercentage,fenwickPercentage,iceTime,xOnGoalFor,xGoalsFor,xReboundsFor,xFreezeFor,xPlayStoppedFor,xPlayContinuedInZoneFor,xPlayContinuedOutsideZoneFor,flurryAdjustedxGoalsFor,scoreVenueAdjustedxGoalsFor,flurryScoreVenueAdjustedxGoalsFor,shotsOnGoalFor,missedShotsFor,blockedShotAttemptsFor,shotAttemptsFor,goalsFor,reboundsFor,reboundGoalsFor,freezeFor,playStoppedFor,playContinuedInZoneFor,playContinuedOutsideZoneFor,savedShotsOnGoalFor,savedUnblockedShotAttemptsFor,penaltiesFor,penalityMinutesFor,faceOffsWonFor,hitsFor,takeawaysFor,giveawaysFor,lowDangerShotsFor,mediumDangerShotsFor,highDangerShotsFor,lowDangerxGoalsFor,mediumDangerxGoalsFor,highDangerxGoalsFor,lowDangerGoalsFor,mediumDangerGoalsFor,highDangerGoalsFor,scoreAdjustedShotsAttemptsFor,unblockedShotAttemptsFor,scoreAdjustedUnblockedShotAttemptsFor,dZoneGiveawaysFor,xGoalsFromxReboundsOfShotsFor,xGoalsFromActualReboundsOfShotsFor,reboundxGoalsFor,totalShotCreditFor,scoreAdjustedTotalShotCreditFor,scoreFlurryAdjustedTotalShotCreditFor,xOnGoalAgainst,xGoalsAgainst,xReboundsAgainst,xFreezeAgainst,xPlayStoppedAgainst,xPlayContinuedInZoneAgainst,xPlayContinuedOutsideZoneAgainst,flurryAdjustedxGoalsAgainst,scoreVenueAdjustedxGoalsAgainst,flurryScoreVenueAdjustedxGoalsAgainst,shotsOnGoalAgainst,missedShotsAgainst,blockedShotAttemptsAgainst,shotAttemptsAgainst,goalsAgainst,reboundsAgainst,reboundGoalsAgainst,freezeAgainst,playStoppedAgainst,playContinuedInZoneAgainst,playContinuedOutsideZoneAgainst,savedShotsOnGoalAgainst,savedUnblockedShotAttemptsAgainst,penaltiesAgainst,penalityMinutesAgainst,faceOffsWonAgainst,hitsAgainst,takeawaysAgainst,giveawaysAgainst,lowDangerShotsAgainst,mediumDangerShotsAgainst,highDangerShotsAgainst,lowDangerxGoalsAgainst,mediumDangerxGoalsAgainst,highDangerxGoalsAgainst,lowDangerGoalsAgainst,mediumDangerGoalsAgainst,highDangerGoalsAgainst,scoreAdjustedShotsAttemptsAgainst,unblockedShotAttemptsAgainst,scoreAdjustedUnblockedShotAttemptsAgainst,dZoneGiveawaysAgainst,xGoalsFromxReboundsOfShotsAgainst,xGoalsFromActualReboundsOfShotsAgainst,reboundxGoalsAgainst,totalShotCreditAgainst,scoreAdjustedTotalShotCreditAgainst,scoreFlurryAdjustedTotalShotCreditAgainst
            MIN,2008,MIN,MIN,Team Level,other,82,0.48,0.49,0.49,11901.0,143.97,20.06,10.29,28.65,4.91,86.83,54.71,18.49,20.06,18.49,154.0,58.0,61.0,273.0,26.0,9.0,1.0,33.0,2.0,77.0,65.0,128.0,186.0,8.0,16.0,139.0,43.0,19.0,22.0,143.0,53.0,16.0,5.35,6.5,8.21,6.0,8.0,12.0,273.0,212.0,212.0,12.0,2.95,1.16,1.16,21.46,21.46,19.8,140.35,21.66,10.52,27.1,4.72,81.06,54.25,20.69,21.66,20.69,158.0,60.0,67.0,285.0,28.0,11.0,4.0,30.0,4.0,85.0,60.0,130.0,190.0,15.0,34.0,159.0,39.0,17.0,26.0,149.0,46.0,23.0,5.47,5.58,10.61,10.0,2.0,16.0,285.0,218.0,218.0,7.0,3.09,2.24,2.22,21.35,21.35,20.46
            MTL,2008,MTL,MTL,Team Level,all,82,0.52,0.51,0.51,12000.0,150.0,25.0,11.0,30.0,5.0,90.0,55.0,23.0,25.0,23.0,160.0,60.0,65.0,285.0,30.0,10.0,2.0,35.0,3.0,80.0,70.0,130.0,190.0,10.0,20.0,145.0,45.0,20.0,25.0,150.0,55.0,18.0,6.0,7.0,9.0,7.0,9.0,14.0,285.0,220.0,220.0,14.0,3.0,1.2,1.2,22.0,22.0,20.0,145.0,22.0,11.0,28.0,5.0,85.0,55.0,21.0,22.0,21.0,160.0,62.0,70.0,292.0,28.0,12.0,4.0,32.0,4.0,88.0,62.0,132.0,195.0,16.0,36.0,162.0,40.0,18.0,28.0,152.0,48.0,24.0,5.5,5.6,10.9,10.0,3.0,15.0,292.0,222.0,222.0,8.0,3.1,2.3,2.3,21.5,21.5,20.5
            MTL,2008,Carey Price,MTL,G,all,4,0.50,0.50,0.50,1000.0,10.0,2.0,1.0,3.0,0.5,9.0,5.5,1.8,2.0,1.8,15.0,5.0,6.0,26.0,3.0,1.0,0.0,3.0,0.0,8.0,7.0,12.0,18.0,1.0,2.0,14.0,4.0,2.0,2.0,14.0,5.0,1.0,0.5,0.6,0.8,0.0,1.0,2.0,26.0,20.0,20.0,1.0,0.3,0.1,0.1,2.0,2.0,1.8,14.0,2.0,1.0,2.5,0.4,8.0,5.0,1.9,2.0,1.9,15.0,6.0,6.0,27.0,3.0,1.0,0.0,3.0,0.0,8.0,6.0,12.0,18.0,1.0,3.0,15.0,4.0,2.0,2.0,14.0,4.0,2.0,0.5,0.5,1.0,1.0,0.0,2.0,27.0,21.0,21.0,1.0,0.3,0.2,0.2,2.0,2.0,1.9
            """;

        // Act
        var records = CsvParser.Parse<TeamRecord>(csv).ToList();

        // Assert - verify all records parsed
        Assert.Equal(3, records.Count);

        // Verify Team Level record for MIN
        var minRecord = records.First(r => r.Team == "MIN");
        Assert.Equal("MIN", minRecord.Team);
        Assert.Equal(2008, minRecord.Season);
        Assert.Equal("MIN", minRecord.Name);
        Assert.Equal("Team Level", minRecord.Position);
        Assert.Equal("other", minRecord.Situation);
        Assert.Equal(82, minRecord.GamesPlayed);

        // Verify Team Level record for MTL
        var mtlTeamRecord = records.First(r => r.Team == "MTL" && r.Position == "Team Level");
        Assert.Equal("MTL", mtlTeamRecord.Team);
        Assert.Equal(2008, mtlTeamRecord.Season);
        Assert.Equal("MTL", mtlTeamRecord.Name);
        Assert.Equal("Team Level", mtlTeamRecord.Position);
        Assert.Equal("all", mtlTeamRecord.Situation);
        Assert.Equal(82, mtlTeamRecord.GamesPlayed);

        // Verify player record for Carey Price (should NOT be Team Level)
        var playerRecord = records.First(r => r.Name == "Carey Price");
        Assert.Equal("MTL", playerRecord.Team);
        Assert.Equal("G", playerRecord.Position);
        Assert.Equal("all", playerRecord.Situation);
        Assert.Equal(4, playerRecord.GamesPlayed);
    }

    [Fact]
    public void Filter_TeamLevelOnly_ExcludesPlayerRecords()
    {
        // Arrange
        var csv = """
            team,season,name,team,position,situation,games_played,xGoalsPercentage,corsiPercentage,fenwickPercentage,iceTime,xOnGoalFor,xGoalsFor,xReboundsFor,xFreezeFor,xPlayStoppedFor,xPlayContinuedInZoneFor,xPlayContinuedOutsideZoneFor,flurryAdjustedxGoalsFor,scoreVenueAdjustedxGoalsFor,flurryScoreVenueAdjustedxGoalsFor,shotsOnGoalFor,missedShotsFor,blockedShotAttemptsFor,shotAttemptsFor,goalsFor,reboundsFor,reboundGoalsFor,freezeFor,playStoppedFor,playContinuedInZoneFor,playContinuedOutsideZoneFor,savedShotsOnGoalFor,savedUnblockedShotAttemptsFor,penaltiesFor,penalityMinutesFor,faceOffsWonFor,hitsFor,takeawaysFor,giveawaysFor,lowDangerShotsFor,mediumDangerShotsFor,highDangerShotsFor,lowDangerxGoalsFor,mediumDangerxGoalsFor,highDangerxGoalsFor,lowDangerGoalsFor,mediumDangerGoalsFor,highDangerGoalsFor,scoreAdjustedShotsAttemptsFor,unblockedShotAttemptsFor,scoreAdjustedUnblockedShotAttemptsFor,dZoneGiveawaysFor,xGoalsFromxReboundsOfShotsFor,xGoalsFromActualReboundsOfShotsFor,reboundxGoalsFor,totalShotCreditFor,scoreAdjustedTotalShotCreditFor,scoreFlurryAdjustedTotalShotCreditFor,xOnGoalAgainst,xGoalsAgainst,xReboundsAgainst,xFreezeAgainst,xPlayStoppedAgainst,xPlayContinuedInZoneAgainst,xPlayContinuedOutsideZoneAgainst,flurryAdjustedxGoalsAgainst,scoreVenueAdjustedxGoalsAgainst,flurryScoreVenueAdjustedxGoalsAgainst,shotsOnGoalAgainst,missedShotsAgainst,blockedShotAttemptsAgainst,shotAttemptsAgainst,goalsAgainst,reboundsAgainst,reboundGoalsAgainst,freezeAgainst,playStoppedAgainst,playContinuedInZoneAgainst,playContinuedOutsideZoneAgainst,savedShotsOnGoalAgainst,savedUnblockedShotAttemptsAgainst,penaltiesAgainst,penalityMinutesAgainst,faceOffsWonAgainst,hitsAgainst,takeawaysAgainst,giveawaysAgainst,lowDangerShotsAgainst,mediumDangerShotsAgainst,highDangerShotsAgainst,lowDangerxGoalsAgainst,mediumDangerxGoalsAgainst,highDangerxGoalsAgainst,lowDangerGoalsAgainst,mediumDangerGoalsAgainst,highDangerGoalsAgainst,scoreAdjustedShotsAttemptsAgainst,unblockedShotAttemptsAgainst,scoreAdjustedUnblockedShotAttemptsAgainst,dZoneGiveawaysAgainst,xGoalsFromxReboundsOfShotsAgainst,xGoalsFromActualReboundsOfShotsAgainst,reboundxGoalsAgainst,totalShotCreditAgainst,scoreAdjustedTotalShotCreditAgainst,scoreFlurryAdjustedTotalShotCreditAgainst
            MTL,2008,MTL,MTL,Team Level,all,82,0.52,0.51,0.51,12000.0,150.0,25.0,11.0,30.0,5.0,90.0,55.0,23.0,25.0,23.0,160.0,60.0,65.0,285.0,30.0,10.0,2.0,35.0,3.0,80.0,70.0,130.0,190.0,10.0,20.0,145.0,45.0,20.0,25.0,150.0,55.0,18.0,6.0,7.0,9.0,7.0,9.0,14.0,285.0,220.0,220.0,14.0,3.0,1.2,1.2,22.0,22.0,20.0,145.0,22.0,11.0,28.0,5.0,85.0,55.0,21.0,22.0,21.0,160.0,62.0,70.0,292.0,28.0,12.0,4.0,32.0,4.0,88.0,62.0,132.0,195.0,16.0,36.0,162.0,40.0,18.0,28.0,152.0,48.0,24.0,5.5,5.6,10.9,10.0,3.0,15.0,292.0,222.0,222.0,8.0,3.1,2.3,2.3,21.5,21.5,20.5
            MTL,2008,Carey Price,MTL,G,all,4,0.50,0.50,0.50,1000.0,10.0,2.0,1.0,3.0,0.5,9.0,5.5,1.8,2.0,1.8,15.0,5.0,6.0,26.0,3.0,1.0,0.0,3.0,0.0,8.0,7.0,12.0,18.0,1.0,2.0,14.0,4.0,2.0,2.0,14.0,5.0,1.0,0.5,0.6,0.8,0.0,1.0,2.0,26.0,20.0,20.0,1.0,0.3,0.1,0.1,2.0,2.0,1.8,14.0,2.0,1.0,2.5,0.4,8.0,5.0,1.9,2.0,1.9,15.0,6.0,6.0,27.0,3.0,1.0,0.0,3.0,0.0,8.0,6.0,12.0,18.0,1.0,3.0,15.0,4.0,2.0,2.0,14.0,4.0,2.0,0.5,0.5,1.0,1.0,0.0,2.0,27.0,21.0,21.0,1.0,0.3,0.2,0.2,2.0,2.0,1.9
            MTL,2008,Alex Kovalev,MTL,L,all,78,0.51,0.50,0.50,11000.0,140.0,22.0,10.0,28.0,4.5,85.0,52.0,20.0,22.0,20.0,155.0,58.0,62.0,275.0,28.0,9.0,1.0,32.0,2.0,78.0,68.0,127.0,185.0,9.0,18.0,140.0,42.0,18.0,23.0,145.0,52.0,16.0,5.5,6.5,8.5,6.0,8.0,14.0,275.0,213.0,213.0,12.0,2.8,1.1,1.1,21.0,21.0,19.5,142.0,21.5,10.5,27.5,4.7,83.0,54.0,20.5,21.5,20.5,158.0,60.0,68.0,286.0,27.0,11.0,3.0,31.0,3.0,86.0,61.0,131.0,193.0,15.0,35.0,160.0,39.0,17.0,27.0,150.0,47.0,23.0,5.45,5.55,10.5,9.0,2.0,16.0,286.0,218.0,218.0,7.0,3.05,2.2,2.2,21.3,21.3,20.4
            """;

        // Act
        var records = CsvParser.Parse<TeamRecord>(csv).ToList();
        var teamLevelOnly = records.Where(r => r.Position == "Team Level").ToList();

        // Assert
        Assert.Equal(3, records.Count);
        Assert.Single(teamLevelOnly);
        Assert.Equal("MTL", teamLevelOnly[0].Team);
        Assert.Equal(82, teamLevelOnly[0].GamesPlayed);
    }
}
