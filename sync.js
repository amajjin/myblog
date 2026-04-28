const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function sync() {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      property: 'Status',
      select: { equals: 'Published' }
    }
  });

  console.log(`Found ${response.results.length} published pages`);

  for (const page of response.results) {
    const title = page.properties.Title.title[0]?.plain_text || 'Untitled';
    const date = page.properties.Date?.date?.start || new Date().toISOString().split('T')[0];
    const tags = page.properties.Tags?.multi_select?.map(t => t.name) || [];
    const slug = page.properties.Slug?.rich_text[0]?.plain_text ||
                 title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const mdBlocks = await n2m.pageToMarkdown(page.id);
    const mdContent = n2m.toMarkdownString(mdBlocks);

    const frontMatter = `---
title: "${title}"
date: ${date}
draft: false
tags: [${tags.map(t => `"${t}"`).join(', ')}]
---
`;

    const filePath = path.join('content', 'posts', `${slug}.md`);
    fs.writeFileSync(filePath, frontMatter + mdContent.parent);
    console.log(`Synced: ${slug}.md`);
  }
}

sync().catch(console.error);
