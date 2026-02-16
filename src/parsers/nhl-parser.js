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
 * Parser for NHL data.
 */
export class NHLParser {
  /**
   * The URL to fetch NHL data from.
   */
  url = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard';

  /**
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
    const competitors = competition.competitors || [];
    if (competitors.length < 2) return null;
    const teamOne = competitors[0];
    const teamTwo = competitors[1];
    let status = (event.status && event.status.type && event.status.type.detail) || '';
    const statusName = event.status && event.status.type && event.status.type.name;
    if (statusName === 'STATUS_SCHEDULED') {
      status = 'Scheduled';
    } else if (statusName === 'STATUS_FINAL') {
      status = 'Final';
    } else if (statusName === 'STATUS_CANCELED') {
      status = 'Canceled';
    } else if (statusName === 'STATUS_IN_PROGRESS') {
      status = (event.status && event.status.type && event.status.type.detail) || 'In Progress';
    }
    return {
      id: event.id,
      date: formattedDate,
      time: time,
      status: status,
      status_type: statusName || '',
      league: 'NHL',
      league_badge: 'https://a.espncdn.com/i/teamlogos/leagues/500-dark/nhl.png',
      team_one: {
        id: teamOne.team && teamOne.team.id,
        abbreviation: teamOne.team && teamOne.team.abbreviation,
        badge: teamOne.team && teamOne.team.logo,
        location: teamOne.team && teamOne.team.location,
        name: teamOne.team && teamOne.team.name,
        score: parseInt(teamOne.score, 10) || 0
      },
      team_two: {
        id: teamTwo.team && teamTwo.team.id,
        abbreviation: teamTwo.team && teamTwo.team.abbreviation,
        badge: teamTwo.team && teamTwo.team.logo,
        location: teamTwo.team && teamTwo.team.location,
        name: teamTwo.team && teamTwo.team.name,
        score: parseInt(teamTwo.score, 10) || 0
      }
    };
  }
}
