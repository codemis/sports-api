import { formatEventDateTime } from '../utilities.js';

/**
 * Parser for NFL data.
 */
export class NFLParser {
  /**
   * The URL to fetch NFL data from.
   */
  url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

  /**
   * 
   * @param {any} response The response from the endpoint
   *
   * @returns An array of the data
   */
  parse(response) {
    if (response && response.events) {
      return response.events.map(event => this.formatEvent(event)).filter(Boolean);
    }
    return [];
  }

  /**
   * Format the data for our API
   *
   * @param {any} event The event data
   *
   * @returns Formatted event data
   */
  formatEvent(event) {
    if (!event || !event.competitions || event.competitions.length === 0) {
      return null;
    }
    const { date: formattedDate, time } = formatEventDateTime(event.date);
    const competition = event.competitions[0];
    const teamOne = competition.competitors[0];
    const teamTwo = competition.competitors[1];
    let status = event.status.type.detail || '';
    if (event.status.type.name === 'STATUS_SCHEDULED') {
      status = 'Scheduled';
    } else if (event.status.type.name === 'STATUS_FINAL') {
      status = 'Final';
    } else if (event.status.type.name === 'STATUS_CANCELED') {
      status = 'Canceled';
    } else if (event.status.type.name === 'STATUS_IN_PROGRESS') {
      status = event.status.type.detail || 'In Progress';
    }
    return {
      id: event.id,
      date: formattedDate,
      time: time,
      status: status,
      league: 'NFL',
      leagueBadge: 'https://a.espncdn.com/i/teamlogos/leagues/500-dark/nfl.png',
      team_one: {
        id: teamOne.team.id,
        name: teamOne.team.name,
        badge: teamOne.team.logo,
        score: parseInt(teamOne.score, 10) || 0
      },
      team_two: {
        id: teamTwo.team.id,
        name: teamTwo.team.name,
        badge: teamTwo.team.logo,
        score: parseInt(teamTwo.score, 10) || 0
      }
    };
  }
}
