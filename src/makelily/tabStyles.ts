/**
 * @license
 * This file is part of Makelily.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

import { StyleSheet } from 'aphrodite';

// tslint:disable-next-line typedef
const tabStyles = StyleSheet.create({
  insert: {
    ':hover': {
      backgroundColor: 'rgb(26, 68, 100)',
    },
    backgroundColor: 'rgb(0, 42, 74)',
    borderColor: 'rgb(0, 42, 74)',
    borderRadius: '0 0 4px 4px',
    borderWidth: '1px 1px 0px 1px !important',
    boxShadow: 'transparent 0px 0px 4px 4px',
    color: 'white',
    cursor: 'pointer',
    height: 30,
    width: '100%',
  },
  lyPreview: {
    backgroundColor: '#f6f7f7',
    borderRadius: '4px 4px 0 0',
    marginBottom: 0,
    minHeight: 80,
    padding: 15,
  },
  paletteSml: {
    fontSize: 22,
  },
  radioGroup: {
    marginLeft: 15,
  },
  resetFont: {
    fontSize: '1em',
  },
  section: {
    ':first-of-type': {
      marginTop: 0,
    },
    marginTop: 20,
  },
  selectableDescription: {
    backgroundColor: 'rgb(0, 42, 74)',
    bottom: 0,
    color: 'white',
    fontSize: 10,
    height: 14,
    left: 0,
    lineHeight: '14px',
    position: 'absolute',
    right: 0,
    textAlign: 'center',
  },
  selectableList: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  selectableOption: {
    ':hover': {
      backgroundColor: '#f6f7f7',
    },
    border: '1px solid #D6D8DA',
    borderRadius: 4,
    color: '#aeaeae',
    cursor: 'pointer',
    display: 'inline-block',
    margin: 15,
    overflow: 'hidden',
    position: 'relative',
    width: 50,
  },
  selectableSelected: {
    backgroundColor: '#f6f7f7',
    cursor: 'default',
  },
  spacer: {
    flexGrow: 1,
  },
  tool: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'scroll',
    padding: '25px 15px 15px 15px',
  },
  toolHeading: {
    fontSize: 18,
    margin: 0,
  },
});

export default tabStyles;
