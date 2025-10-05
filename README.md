# Sports API

This project is a script that pulls sports event data from the SportsDB API and consolidates it into a local JSON file. It is designed to be run with a league ID as an argument, fetching and updating events for that specific league. It will capture the events from yesterday and today.

## Prerequisites

- Node.js installed on your machine.
- An API key from [SportsDB](https://www.thesportsdb.com/). You can obtain one by signing up on their website.
- Create a `.env` file in the root directory of the project and add your API key and version:
  ```
  API_KEY=your_api_key_here
  API_VERSION=1
  ```
- Install the required npm packages by running:
  ```
  npm install axios dotenv
  ```

## Usage

To run the script, use the following command in your terminal, replacing `<league_id>` with the desired league ID (NFL, NBA, MLB, etc.):
```
    node script.js <league_id>
```
