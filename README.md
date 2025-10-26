# Sports API

This project is a script that pulls sports event data from a remote API and consolidates it into a local JSON file. It is designed to be run with a league ID as an argument, fetching and updating events for that specific league. It will capture the events from yesterday and today.

## Prerequisites

- Node.js installed on your machine.
- Install the required npm packages by running:
  ```
  npm install axios
  ```

## Usage

To run the script, use the following command in your terminal, replacing `<league_id>` with the desired league ID (NFL, NBA, or MLB):
```
    node script.js <league_id>
```
