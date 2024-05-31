import {accessToken} from "./accessToken.js";

document.getElementById('fetchFilesButton').addEventListener('click', async () => {
    try {
        const files = await listFilesFromOneDrive();
        const regex = /(.+) Quiz (\d+)_(\d+)_(\d+)\.xlsx/;
        const dataframes = {};
        const month = new Date().getMonth() + 1;
        const monthStr = month.toString();

        for (const file of files) {
            const match = file.name.match(regex);
            if (match && match[3] === monthStr) {
                const data = await fetchFileFromOneDrive(file.id);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                const filename = `${match[1].toLowerCase()}_${match[2]}_${match[3]}`;
                let df = formatXlsx(jsonData, filename);
                const quizDate = `20${match[4]}-${match[3]}-${match[2]}`;
                df = addQuizDate(df, filename, quizDate);
                dataframes[filename] = df;
            }
        }

        let mergedDf = joinQuizDfs(dataframes);
        mergedDf = removeOptedOut(mergedDf);
        mergedDf = sortAndRank(mergedDf);

        if (Array.isArray(mergedDf) && mergedDf.length > 0) {
            displayTable(mergedDf);
        } else {
            console.error('Merged DataFrame is empty or invalid:', mergedDf);
        }
    } catch (error) {
        console.error('Error fetching or parsing files:', error);
    }
});

async function listFilesFromOneDrive() {
    const url = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to list files from OneDrive');
    }

    const data = await response.json();
    return data.value;
}

async function fetchFileFromOneDrive(fileId) {
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch file from OneDrive');
    }

    const data = await response.arrayBuffer();
    return new Uint8Array(data);
}

function formatXlsx(data, filename) {
    const headers = data[0];
    let optOutColName = 'Would you like to opt out of the leaderboard?';
    if (filename.startsWith('anagrams_1_5')) {
        optOutColName = 'To opt out of the leaderboard, please click here :)';
    }

    const indices = [
        headers.indexOf('Name'),
        headers.indexOf('Total points'),
        headers.indexOf(optOutColName),
        headers.indexOf('Start time')
    ];

    return data.slice(1).map(row => ({
        name: row[indices[0]],
        [`pts_${filename}`]: row[indices[1]],
        [`opt_out_${filename}`]: row[indices[2]] ? 1 : 0,
        [`start_time_${filename}`]: new Date(Date.UTC(0, 0, row[indices[3]] - 1))
    }));
}

function addQuizDate(df, filename, quizDate) {
    const quizDateObj = new Date(quizDate);

    df.forEach(row => {
        row[`days_late_${filename}`] = Math.ceil((row[`start_time_${filename}`] - quizDateObj) / (1000 * 60 * 60 * 24));

        if (row[`days_late_${filename}`] > 7) {
            row[`pts_${filename}`] = 0;
        }
    });

    return df.map(row => {
        const { [`start_time_${filename}`]: _, [`days_late_${filename}`]: __, ...rest } = row;
        return rest;
    });
}

function joinQuizDfs(dataframes) {
    let mergedDf = [];

    // Create a set of all unique column names
    const allColumns = new Set();
    for (const df of Object.values(dataframes)) {
        df.forEach(row => {
            Object.keys(row).forEach(col => allColumns.add(col));
        });
    }

    for (const [filename, df] of Object.entries(dataframes)) {
        df.forEach(row => {
            const existingRow = mergedDf.find(r => r.name === row.name);
            if (existingRow) {
                Object.assign(existingRow, row);
            } else {
                // Initialize all columns to null for new rows
                const newRow = { name: row.name };
                allColumns.forEach(col => {
                    newRow[col] = row[col] || null;
                });
                mergedDf.push(newRow);
            }
        });
    }

    // Ensure all columns are present in each row
    mergedDf.forEach(row => {
        allColumns.forEach(col => {
            if (!(col in row)) {
                row[col] = null;
            }
        });
    });

    return mergedDf;
}

function removeOptedOut(df) {
// Filter out rows where opt_out_sum is 0
    return df.filter(row => {
        let optOutSum = 0;
        Object.keys(row).forEach(key => {
            if (key.startsWith('opt_out_')) {
                optOutSum += row[key];
                // Remove individual 'opt_out_' columns
                delete row[key];
            }
        });
        // Return true if opt_out_sum is 0, indicating the row should be kept
        return optOutSum === 0;
    });
}

function sortAndRank(df) {
    // Calculate total_pts by summing values from columns starting with 'pts_'
    df.forEach(row => {
        row.total_pts = Object.keys(row).reduce((total, key) => {
            if (key.startsWith('pts_')) {
                return total + row[key];
            }
            return total;
        }, 0);
    });

    // Sort the dataframe by total_pts in descending order
    df.sort((a, b) => b.total_pts - a.total_pts);

    let rank = 1;
    let prevTotalPts = df[0].total_pts;
    // Assign ranks based on sorted order, handling ties
    df.forEach((row, index) => {
        if (row.total_pts < prevTotalPts) {
            rank = index + 1;
        }
        row.position = rank;
        prevTotalPts = row.total_pts;
    });

    return df;
}

function displayTable(data) {
    const container = document.getElementById('tablesContainer');
    const table = document.createElement('table');

    const headersDict = {'position':'Position', 'name':'Name', 'total_pts':'Total Points'}; // Define the headers to display
    const headerRow = document.createElement('tr');

    for (const [colName, header] of Object.entries(headersDict)) {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    data.forEach(row => {
        const tr = document.createElement('tr');
        for (const [colName, header] of Object.entries(headersDict)) {
                const td = document.createElement('td');
                td.textContent = row[colName];
                tr.appendChild(td);
            }
            table.appendChild(tr);
    });

    container.appendChild(table);
}

