# PYTHON CODE WHICH CREATES THE LEADERBOARD.CSV FILE

import os
import re
from datetime import datetime

import numpy as np
import pandas as pd


def format_xlsx(file_path, filename):
    df = pd.read_excel(file_path, sheet_name="Sheet1")
    opt_out_col_name = 'Would you like to opt out of the leaderboard?'
    if "anagrams_1_5" in filename:
        opt_out_col_name = 'To opt out of the leaderboard, please click here :)'

    df = df[['Name',
             'Total points',
             opt_out_col_name,
             'Start time']]
    df.rename(columns={'Name': 'name',
                       'Total points': 'pts_' + filename,
                       opt_out_col_name: 'opt_out_' + filename,
                       'Start time': 'start_time_' + filename},
              inplace=True)

    df['start_time_' + filename] = df['start_time_' + filename].dt.date
    df['start_time_' + filename] = pd.to_datetime(df['start_time_' + filename], format='%Y-%M-%d')
    df['opt_out_' + filename] = np.where(pd.isna(df['opt_out_' + filename]), 0, 1)
    return df


def read_format_xlsx():
    folder_path = '/Users/bella.jones/Library/CloudStorage/OneDrive-AutoTraderGroupPlc'
    files = os.listdir(folder_path)
    xlsx_files = [file for file in files if file.endswith('.xlsx')]

    dataframes = {}
    month = datetime.now().month
    pattern = r'(.+) Quiz (\d+)_(%s)_(\d+)\.xlsx' % month

    for xlsx_file in xlsx_files:
        file_path = os.path.join(folder_path, xlsx_file)
        match = re.match(pattern, xlsx_file)
        if match:
            filename = match.group(1).lower() + '_' + match.group(2) + '_' + match.group(3)
            # print(filename)
            dataframe = format_xlsx(file_path, filename)
            dataframes[filename] = dataframe
            quiz_date = match.group(4) + '-' + match.group(3) + '-' + match.group(2)
            dataframes[filename]['quiz_date_' + filename] = pd.to_datetime(quiz_date, format='%y-%m-%d')
            dataframes[filename]['days_late_' + filename] = (dataframes[filename]['start_time_' + filename]
                                                             - dataframes[filename]['quiz_date_' + filename]).dt.days
            dataframes[filename].pop('quiz_date_' + filename)
            dataframes[filename].pop('start_time_' + filename)

            for i in range(len(dataframes[filename])):
                if dataframes[filename]['days_late_' + filename][i] > 7:
                    print(dataframes[filename]['days_late_' + filename][i])
                    print(dataframes[filename]['pts_' + filename][i])
                    dataframes[filename]['pts_' + filename][i] = 0
            dataframes[filename].pop('days_late_' + filename)

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

    merged_df['total_pts'] = merged_df.iloc[:, 2:].sum(axis=1).astype(int)
    merged_df.insert(1, 'total_pts', merged_df.pop('total_pts'))

    return merged_df


def remove_opted_out(quiz_data):
    quiz_data = quiz_data[quiz_data['opt_out_count'] == 0]
    return quiz_data


quiz_data_xl = read_format_xlsx()
quiz_data_xl = join_quiz_dfs(quiz_data_xl)
quiz_data_xl = remove_opted_out(quiz_data_xl)
quiz_data_xl = quiz_data_xl.sort_values(by='total_pts', ascending=False)
quiz_data_xl['position'] = quiz_data_xl['total_pts'].rank(method='min', ascending=False).astype(int)
quiz_data_xl.insert(0, 'position', quiz_data_xl.pop('position'))

print(quiz_data_xl.to_string())

quiz_data_xl.to_csv('leaderboard.csv', index=False)


# display(quiz_data)

### TO-DO:
# - need to perfect the website
# - need to work out how to get the site live