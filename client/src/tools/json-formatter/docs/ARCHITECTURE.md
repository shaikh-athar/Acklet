# JSON Formatter Architecture

- **Page**: `json-formatter.component.ts` houses the user interaction logic and controls.
- **Service**: Functions run entirely inside client-side JS memory via `JSON.parse` and `JSON.stringify`.
- **Theme**: Leverages local classes using the `--tool-color` variable and inherits styles from Acklet global colors.
