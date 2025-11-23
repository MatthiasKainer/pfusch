import { test, expect } from '@playwright/test';

test.describe('Progressive Enhancement', () => {
  test('should enhance static table with sorting functionality', async ({ page }) => {
    await page.goto('http://localhost:3030');
    
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module">
          import { pfusch, html, script } from 'http://localhost:3030/pfusch.js';
          
          pfusch("data-table", { sortBy: null, items: [], loading: true }, (state, trigger, { children }) => {
            const sortItems = (items, sortBy) => {
              if (!sortBy) return items;
              return [...items].sort((a, b) => 
                String(a[sortBy]).localeCompare(String(b[sortBy]))
              );
            };
            
            return [
              script(function() {
                console.log('=== DATA-TABLE INITIALIZING ===');
                const tables = children('table');
                console.log('Found tables:', tables?.length);
                
                if (!tables || tables.length === 0) {
                  console.error('NO TABLES FOUND!');
                  throw new Error('Table not found in light DOM');
                }
                
                const table = tables[0];
                const rows = Array.from(table.querySelectorAll('tbody tr'));
                console.log('Found rows:', rows.length);
                
                state.items = rows.map(row => {
                  const cells = row.querySelectorAll('td');
                  const item = {
                    name: cells[0]?.textContent?.trim() || '',
                    status: cells[1]?.textContent?.trim() || ''
                  };
                  console.log('Parsed item:', item);
                  return item;
                });
                
                console.log('All items:', JSON.stringify(state.items));
                state.loading = false;
                console.log('Loading complete');
              }),
              html.div(
                html.button({ 
                  id: 'sort-name',
                  click: () => { 
                    console.log('Sorting by name'); 
                    state.sortBy = 'name'; 
                  }
                }, "Sort by Name"),
                html.button({ 
                  id: 'sort-status',
                  click: () => { 
                    console.log('Sorting by status'); 
                    state.sortBy = 'status'; 
                  }
                }, "Sort by Status"),
                html.button({ 
                  id: 'clear-sort',
                  click: () => { 
                    console.log('Clearing sort'); 
                    state.sortBy = null; 
                  }
                }, "Clear Sort")
              ),
              state.loading
                ? html.slot()
                : html.table(
                    html.thead(html.tr(html.th("Name"), html.th("Status"))),
                    html.tbody({ id: 'sorted-tbody' },
                      ...sortItems(state.items, state.sortBy).map(item =>
                        html.tr(
                          html.td(item.name),
                          html.td(item.status)
                        )
                      )
                    )
                  )
            ];
          });
        </script>
      </head>
      <body>
        <data-table>
          <table>
            <thead><tr><th>Name</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Zebra</td><td>Active</td></tr>
              <tr><td>Apple</td><td>Pending</td></tr>
              <tr><td>Mango</td><td>Active</td></tr>
              <tr><td>Banana</td><td>Pending</td></tr>
            </tbody>
          </table>
        </data-table>
      </body>
      </html>
    `);

    // Wait for component to initialize
    await page.waitForTimeout(1500);
    
    const dataTable = page.locator('data-table');
    
    // Verify the component loaded (should have hidden the slot and shown the shadow DOM table)
    console.log('=== TEST: Checking initial state ===');
    const shadowTable = dataTable.locator('#sorted-tbody');
    await expect(shadowTable).toBeVisible();
    
    // Get initial order (should match the original HTML order)
    let rows = await shadowTable.locator('tr td:first-child').allTextContents();
    console.log('Initial order:', rows);
    expect(rows).toEqual(['Zebra', 'Apple', 'Mango', 'Banana']);
    
    // Test Sort by Name
    console.log('=== TEST: Clicking Sort by Name ===');
    await dataTable.locator('#sort-name').click();
    await page.waitForTimeout(300);
    
    rows = await shadowTable.locator('tr td:first-child').allTextContents();
    console.log('After sort by name:', rows);
    expect(rows).toEqual(['Apple', 'Banana', 'Mango', 'Zebra']);
    
    // Test Sort by Status
    console.log('=== TEST: Clicking Sort by Status ===');
    await dataTable.locator('#sort-status').click();
    await page.waitForTimeout(300);
    
    const allRows = await shadowTable.locator('tr').evaluateAll(rows => 
      rows.map(row => ({
        name: row.cells[0]?.textContent || '',
        status: row.cells[1]?.textContent || ''
      }))
    );
    console.log('After sort by status:', allRows);
    
    // Active comes before Pending alphabetically
    const activeCount = allRows.filter(r => r.status === 'Active').length;
    const pendingCount = allRows.filter(r => r.status === 'Pending').length;
    expect(activeCount).toBe(2);
    expect(pendingCount).toBe(2);
    expect(allRows[0].status).toBe('Active');
    expect(allRows[1].status).toBe('Active');
    expect(allRows[2].status).toBe('Pending');
    expect(allRows[3].status).toBe('Pending');
    
    // Test Clear Sort
    console.log('=== TEST: Clicking Clear Sort ===');
    await dataTable.locator('#clear-sort').click();
    await page.waitForTimeout(300);
    
    rows = await shadowTable.locator('tr td:first-child').allTextContents();
    console.log('After clear sort:', rows);
    expect(rows).toEqual(['Zebra', 'Apple', 'Mango', 'Banana']);
    
    console.log('=== TEST: All assertions passed! ===');
  });
});

