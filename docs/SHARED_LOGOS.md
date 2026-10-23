# Shared institution logos

In institution setup, enter the school name to search logos shared by other teachers. Preview the name and image, then choose **Use this logo**. New logos uploaded in this setup screen are saved to the teacher's library and shared under the entered institution name. No AI or external storage service is needed.

Existing logos can be shared from **Library → Logos → Share with other teachers**. The same screen searches the shared directory. Search uses case-insensitive school-name text, not verified school membership or automatic abbreviation matching: search “University of Rwanda” if “UR” finds nothing. Contributions are teacher supplied, not institution verified. Teachers select an image explicitly; existing logos are never replaced automatically.

Migration `015_shared_institution_logos.sql` stores shared normalized PNG bytes in PostgreSQL. Only the owner of a private logo can contribute it. Reusing a shared logo creates a private library copy, so existing ownership checks, headers and previews continue to work. Repeated reuse returns the same private copy; repeated identical contributions under the normalized school name are deduplicated. The existing 30-logo limit applies. Ordinary private uploads remain private until shared.

Deploy both frontend and API. The hosted startup migration command applies the new table automatically. A frontend deployment alone cannot enable shared-logo endpoints. School documents, headers, student papers and marks remain private.

Administrators using a signed-in Evalot account can add logos directly through Library > Logos > Upload and share a school logo. Enter the institution name, choose a PNG/JPEG, then upload and share. This does not require a teaching assignment at that institution. A separate administrator role or moderation console is not implemented; this contribution flow is available to all signed-in teachers.
