# file-spooder

A password-protected public file browser built with Cloudflare Workers and R2.

## Setup

1. Set the R2 bucket name and route in `wrangler.toml`.
2. Configure the required password before deploying:

   ```sh
   npx wrangler secret put ADMIN_PASSWORD
   ```

3. Deploy with `npx wrangler deploy`.

`ADMIN_PASSWORD` is deliberately required: an unset secret does not permit an empty password.

## File behavior

- Uploads are limited to 5 GB. Files over 50 MB use R2 multipart uploads in 25 MB chunks.
- Existing filenames are protected from accidental overwrite.
- Large downloads support HTTP byte ranges, enabling resumable downloads and media seeking.
- Copy, move, and rename stream data through R2 and preserve HTTP/custom metadata.

Run the checks locally with `npm test` and `npx wrangler deploy --dry-run`.
