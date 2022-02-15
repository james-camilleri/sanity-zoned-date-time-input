import '@testing-library/jest-dom'

import { LayerProvider, ThemeProvider, studioTheme } from '@sanity/ui'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import timezoneMock from 'timezone-mock'

import ZonedDateTimeInput from '../ZonedDateTimeInput'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
})

function formatDate(isoDate: string) {
  return `${isoDate?.split('T')[0]} ${isoDate
    ?.split('T')[1]
    ?.replace(/:00\..+/, '')}`
}

// We need to cheat a bit to snag the time zone input, since it's not marked
// as a text input and testing-library doesn't pick it up.
function getSelectedTimeZone() {
  return (
    screen
      .getByRole('combobox')
      .parentElement.parentElement.parentElement.parentElement.querySelector(
        'input[name="time-zone"]',
      ) as HTMLInputElement
  ).value
}

const DEFAULT_PROPS = {
  onChange: () => {},
  type: {
    title: 'Date & time',
    options: {
      showUtc: true,
    },
  },
}

const MOCKABLE_TIME_ZONES = [
  'Australia/Adelaide',
  'Brazil/East',
  'Europe/London',
  'US/Eastern',
  'US/Pacific',
  'UTC',
] as const

function inputTime(timeString): void {
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: timeString } })
  fireEvent.blur(input)
}

function selectTimeZone(timeZone): void {
  const select: HTMLInputElement = screen.getByRole('combobox')
  userEvent.click(select)
  userEvent.type(select, timeZone)
  userEvent.keyboard('{Enter}')
}

function renderAndReturnTime(time, timeZone): string {
  // The time values usually pass through Sanity's machinations,
  // so we need to do this kinda hacky re-rendering thing to get the
  // updated values and avoid requiring an active connection to Sanity.
  let value
  const onChange = (input: any) => {
    value = input?.patches?.[0]?.value
  }

  const { rerender, debug } = render(
    <ThemeProvider theme={studioTheme}>
      <LayerProvider>
        <ZonedDateTimeInput {...DEFAULT_PROPS} onChange={onChange} />
      </LayerProvider>
    </ThemeProvider>,
  )

  inputTime(time)

  rerender(
    <ThemeProvider theme={studioTheme}>
      <LayerProvider>
        <ZonedDateTimeInput
          {...DEFAULT_PROPS}
          onChange={onChange}
          value={value}
        />
      </LayerProvider>
    </ThemeProvider>,
  )

  selectTimeZone(timeZone)

  rerender(
    <ThemeProvider theme={studioTheme}>
      <LayerProvider>
        <ZonedDateTimeInput
          {...DEFAULT_PROPS}
          onChange={onChange}
          value={value}
        />
      </LayerProvider>
    </ThemeProvider>,
  )

  return value.dateTime
}

describe('ZonedDateTimeInput', () => {
  describe('renders', () => {
    it('with no time or time zone set', () => {
      render(
        <ThemeProvider theme={studioTheme}>
          <LayerProvider>
            <ZonedDateTimeInput {...DEFAULT_PROPS} />
          </LayerProvider>
        </ThemeProvider>,
      )

      expect(screen.getByRole('textbox')).toHaveValue('')
      expect(getSelectedTimeZone()).toBe('Europe/London')
    })

    it('with a time set but no time zone selected', () => {
      render(
        <ThemeProvider theme={studioTheme}>
          <LayerProvider>
            <ZonedDateTimeInput {...DEFAULT_PROPS} value={{ dateTime: DATE }} />
          </LayerProvider>
        </ThemeProvider>,
      )

      expect(screen.getByRole('textbox')).toHaveValue(formatDate(DATE))
      expect(getSelectedTimeZone()).toBe('Europe/London')
    })

    it('with a time zone selected but no time set', () => {
      render(
        <ThemeProvider theme={studioTheme}>
          <LayerProvider>
            <ZonedDateTimeInput
              {...DEFAULT_PROPS}
              value={{ timeZone: { value: 'Europe/Sarajevo', offset: 60 } }}
            />
          </LayerProvider>
        </ThemeProvider>,
      )

      expect(screen.getByRole('textbox')).toHaveValue('')
      expect(getSelectedTimeZone()).toBe('Europe/Sarajevo')
    })

    it('with a raw date-time input string', () => {
      render(
        <ThemeProvider theme={studioTheme}>
          <LayerProvider>
            <ZonedDateTimeInput {...DEFAULT_PROPS} value={DATE} />
          </LayerProvider>
        </ThemeProvider>,
      )

      expect(screen.getByRole('textbox')).toHaveValue(formatDate(DATE))
      expect(getSelectedTimeZone()).toBe('Europe/London')
    })
  })

  const TESTS_TO_ATTEMPT = 30
  let testsAttempted = 0

  for (const mockedTimeZone of MOCKABLE_TIME_ZONES) {
    describe(`with time zone ${mockedTimeZone}`, () => {
      timezoneMock.register(mockedTimeZone)

      const TIMES_TO_TEST = {
        '1992-01-19 00:00': {
          UTC: '1992-01-19T00:00:00.000Z',
          'Europe/London': '1992-01-19T00:00:00.000Z',
          'Europe/Amsterdam': '1992-01-18T23:00:00.000Z',
        },
        '1992-01-19 02:00': {
          UTC: '1992-01-19T02:00:00.000Z',
          'Europe/London': '1992-01-19T02:00:00.000Z',
          'Europe/Amsterdam': '1992-01-19T01:00:00.000Z',
        },
        '1992-01-19 07:00': {
          UTC: '1992-01-19T07:00:00.000Z',
          'Europe/London': '1992-01-19T07:00:00.000Z',
          'Europe/Amsterdam': '1992-01-19T06:00:00.000Z',
        },
        '1992-01-19 10:30': {
          UTC: '1992-01-19T10:30:00.000Z',
          'Europe/London': '1992-01-19T10:30:00.000Z',
          'Europe/Amsterdam': '1992-01-19T09:30:00.000Z',
        },
        '1992-01-19 15:15': {
          UTC: '1992-01-19T15:15:00.000Z',
          'Europe/London': '1992-01-19T15:15:00.000Z',
          'Europe/Amsterdam': '1992-01-19T14:15:00.000Z',
        },
        '1992-01-19 19:19': {
          UTC: '1992-01-19T19:19:00.000Z',
          'Europe/London': '1992-01-19T19:19:00.000Z',
          'Europe/Amsterdam': '1992-01-19T18:19:00.000Z',
        },
        '1992-01-19 23:59': {
          UTC: '1992-01-19T23:59:00.000Z',
          'Europe/London': '1992-01-19T23:59:00.000Z',
          'Europe/Amsterdam': '1992-01-19T22:59:00.000Z',
        },
        '1992-06-19 00:00': {
          UTC: '1992-06-19T00:00:00.000Z',
          'Europe/London': '1992-06-18T00:23:00.000Z',
          'Europe/Amsterdam': '1992-06-18T22:00:00.000Z',
        },
        '1992-06-19 02:00': {
          UTC: '1992-06-19T02:00:00.000Z',
          'Europe/London': '1992-06-19T01:00:00.000Z',
          'Europe/Amsterdam': '1992-06-19T00:00:00.000Z',
        },
        '1992-06-19 07:00': {
          UTC: '1992-06-19T07:00:00.000Z',
          'Europe/London': '1992-06-19T06:00:00.000Z',
          'Europe/Amsterdam': '1992-06-19T05:00:00.000Z',
        },
        '1992-06-19 10:30': {
          UTC: '1992-06-19T10:30:00.000Z',
          'Europe/London': '1992-06-19T09:30:00.000Z',
          'Europe/Amsterdam': '1992-06-19T08:30:00.000Z',
        },
        '1992-06-19 15:15': {
          UTC: '1992-06-19T15:15:00.000Z',
          'Europe/London': '1992-06-19T14:15:00.000Z',
          'Europe/Amsterdam': '1992-06-19T13:15:00.000Z',
        },
        '1992-06-19 19:19': {
          UTC: '1992-06-19T19:19:00.000Z',
          'Europe/London': '1992-06-19T18:19:00.000Z',
          'Europe/Amsterdam': '1992-06-19T17:19:00.000Z',
        },
        '1992-06-19 23:59': {
          UTC: '1992-06-19T23:59:00.000Z',
          'Europe/London': '1992-06-19T22:59:00.000Z',
          'Europe/Amsterdam': '1992-06-19T21:59:00.000Z',
        },
      }

      for (const time of Object.keys(TIMES_TO_TEST)) {
        describe(`correctly saves the time "${time}"`, () => {
          for (const timeZone of Object.keys(TIMES_TO_TEST[time])) {
            if (testsAttempted === TESTS_TO_ATTEMPT) return
            it(`with the time zone "${timeZone}" selected`, async () => {
              const utcDateTime = renderAndReturnTime(time, timeZone)
              expect(utcDateTime).toBe(TIMES_TO_TEST[time][timeZone])
            })
            // TODO: Remove this when you're done.
            testsAttempted++
          }
        })
      }
    })
  }
})
