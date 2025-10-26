/**
 * Sports API - A script that pulls sports event data from SportsDB API
 * Copyright (C) 2025 Johnathan Pulos
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { formatEventDateTime } from '../utilities.js';

/**
 * Parser for NBA data.
 */
export class NBAParser {
  /**
   * The URL to fetch NFL data from.
   */
  url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

  /**
   * Parse the response data
   *
   * @param {any} response The response from the endpoint
   *
   * @returns An array of the data
   */
  parse(response) {
    if (response && Array.isArray(response.events)) {
      return response.events
        .map(event => this.formatEvent(event))
        .filter(Boolean); // drop null/undefined results
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
      status_type: event.status.type.name || '',
      league: 'NBA',
      league_badge: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png',
      team_one: {
        id: teamOne.team.id,
        badge: teamOne.team.logo,
        location: teamOne.team.location,
        name: teamOne.team.name,
        score: parseInt(teamOne.score, 10) || 0
      },
      team_two: {
        id: teamTwo.team.id,
        badge: teamTwo.team.logo,
        location: teamTwo.team.location,
        name: teamTwo.team.name,
        score: parseInt(teamTwo.score, 10) || 0
      }
    };
  }
}
