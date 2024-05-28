# PYTHON CODE WHICH CREATES THE LEADERBOARD.CSV FILE

import os
import re

import numpy as np
import pandas as pd
from datetime import datetime


def format_xlsx(file_path, filename):
    df = pd.read_excel(file_path, sheet_name="Sheet1")
    opt_out_col_name = 'Would you like to opt out of the leaderboard?'
    if "anagrams_1_5" in filename:
        opt_out_col_name = 'To opt out of the leaderboard, please click here :)'
    # if "dingbats" in filename:
    #     opt_out_col_name = 'If you would like to opt out of the leaderboard, please tick here :)'

    df = df[['Name',
             'Total points',
             opt_out_col_name]]
    df.rename(columns={'Name': 'name',
                       'Total points': 'pts_' + filename,
                       opt_out_col_name: 'opt_out_' + filename},
              inplace=True)

    df['opt_out_' + filename] = np.where(pd.isna(df['opt_out_' + filename]), 0, 1)
    return df


def read_format_xlsx():
    folder_path = '/Users/bella.jones/Library/CloudStorage/OneDrive-AutoTraderGroupPlc'
    files = os.listdir(folder_path)
    xlsx_files = [file for file in files if file.endswith('.xlsx')]

    dataframes = {}
    month = datetime.now().month
    pattern = r'(.+) Quiz (\d+)_(%s)_(\d+)\.xlsx' % month
    # pattern = r'(.+) Quiz (\d+)_(%s)_(\d+)\.csv' % month

    for xlsx_file in xlsx_files:
        file_path = os.path.join(folder_path, xlsx_file)
        match = re.match(pattern, xlsx_file)
        if match:
            filename = match.group(1).lower() + '_' + match.group(2) + '_' + match.group(3)
            print(filename)
            dataframe = format_xlsx(file_path, filename)
            dataframes[filename] = dataframe
            # dataframe.display()

    return dataframes


def join_quiz_dfs(quiz_dfs):
    merged_df = None
    opt_out_columns = [f'opt_out_{name}' for name in quiz_dfs]  # Generate opt_out column names

    for name, df in quiz_dfs.items():
        if merged_df is None:
            merged_df = df
        else:
            merged_df = pd.merge(merged_df, df,
                                 on='name',
                                 how='outer')

    merged_df['opt_out_count'] = merged_df[opt_out_columns].sum(axis=1)
    [merged_df.pop(opt_out_col) for opt_out_col in opt_out_columns]
    merged_df.insert(1, 'opt_out_count', merged_df.pop('opt_out_count'))

    merged_df = merged_df.fillna(0)

    merged_df['total_pts'] = merged_df.iloc[:, 2:].sum(axis=1)
    merged_df.insert(1, 'total_pts', merged_df.pop('total_pts'))

    return merged_df


def remove_opted_out(quiz_data):
    quiz_data = quiz_data[quiz_data['opt_out_count'] == 0]
    return quiz_data


quiz_data_xl = read_format_xlsx()
quiz_data_xl = join_quiz_dfs(quiz_data_xl)
quiz_data_xl = remove_opted_out(quiz_data_xl)
quiz_data_xl = quiz_data_xl.sort_values(by='total_pts', ascending=False)
quiz_data_xl['position'] = range(1, len(quiz_data_xl) + 1)
quiz_data_xl.insert(0, 'position', quiz_data_xl.pop('position'))
# quiz_data_xl.insert(1, 'total_pts', quiz_data_xl.pop('total_pts'))

print(quiz_data_xl.to_string())

quiz_data_xl.to_csv('leaderboard.csv', index=False)


# display(quiz_data)

### TO-DO:
# - need to deal with tie-breaks (change position thing to rank?)
# - need to perfect the website
# - need to work out how to get the site live