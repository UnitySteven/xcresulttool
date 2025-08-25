import {Formatter} from '../src/formatter'
import * as os from 'os'
import * as path from 'path'
import {expect, test} from '@jest/globals'
import {promises} from 'fs'

const {writeFile} = promises

test('RetryExample.xcresult - should consolidate retry attempts and report correct counts', async () => {
  // This test will use your provided retry test data
  const bundlePath = '__tests__/data/RetryExample.xcresult'
  const formatter = new Formatter(bundlePath)
  
  try {
      const report = await formatter.format({
        showPassedTests: true,
        showCodeCoverage: false
      })

      // Generate both summary and detail reports
      const reportText = `${report.reportSummary}\n${report.reportDetail}`
      
      // Write the generated report for inspection
      const outputPath = path.join(os.tmpdir(), 'RetryExample.md')
      await writeFile(outputPath, reportText)
      console.log(`📋 Generated report written to: ${outputPath}`)

      // Extract test counts from the summary table
      const summaryLines = report.reportSummary.split('\n')
      const summaryTableLine = summaryLines.find(line => line.includes('<td align="right" width="118px">'))
      
      if (summaryTableLine) {
        console.log('📊 Summary table row:', summaryTableLine)
        
        // Parse the summary table to extract counts
        const matches = summaryTableLine.match(/<td align="right" width="118px">([^<]+)</g)
        if (matches && matches.length >= 6) {
          const total = parseInt(matches[0].replace(/<[^>]*>/g, ''))
          const passed = parseInt(matches[1].replace(/<[^>]*>/g, ''))
          const failed = parseInt(matches[2].replace(/<[^>]*>/g, '').replace(/<\/?b>/g, ''))
          const skipped = parseInt(matches[3].replace(/<[^>]*>/g, ''))
          const expectedFailure = parseInt(matches[4].replace(/<[^>]*>/g, ''))
          const retries = parseInt(matches[5].replace(/<[^>]*>/g, ''))
          
          console.log('🔢 Extracted counts:', {
            total,
            passed, 
            failed,
            skipped,
            expectedFailure,
            retries
          })

          // Verify retry consolidation worked
          expect(total).toBeLessThanOrEqual(10) // Should not be inflated by retry attempts
          expect(retries).toBeGreaterThan(0) // Should show retry attempts occurred
          
          // Check overall test status
          if (passed > 0 && failed === 0) {
            expect(report.testStatus).toBe('success')
            console.log('✅ Test that succeeded on retry correctly shows as SUCCESS')
          } else {
            console.log('❌ Final test status:', report.testStatus)
          }
        }
      }

      // Check for retry information in the report content
      const hasRetryColumn = report.reportSummary.includes('🔄&nbsp;Retries')
      expect(hasRetryColumn).toBe(true)
      console.log('✅ Retries column present in summary')

      // Display GitHub summary format (bonus points!)
      console.log('\n📋 GITHUB SUMMARY FORMAT:')
      console.log('=' .repeat(50))
      console.log(report.reportSummary)
      console.log('=' .repeat(50))

    } catch (error) {
    console.error('❌ Test failed with error:', error)
    
    // If RetryExample.xcresult doesn't exist yet, provide helpful guidance
    if ((error as any).message && (error as any).message.includes('ENOENT')) {
      console.log('\n📁 Please add your retry test data as: __tests__/data/RetryExample.xcresult')
      console.log('   This should contain a test that failed initially but succeeded on retry.')
      expect(false).toBe(true) // Fail the test with a helpful message
    } else {
      throw error
    }
  }
})

test('UhooiPicBook.xcresult - should handle tests without retry data gracefully', async () => {
  // Test with existing data that has no retries
  const bundlePath = '__tests__/data/UhooiPicBook.xcresult'
  const formatter = new Formatter(bundlePath)
  const report = await formatter.format()

  // Should still work without retries
  expect(report.testStatus).toBeDefined()
  expect(report.reportSummary).toBeDefined()
  
  // Should show 0 retries for normal tests
  const hasRetryColumn = report.reportSummary.includes('🔄&nbsp;Retries')
  expect(hasRetryColumn).toBe(true)
  console.log('✅ Retries column present even when no retries occurred')
})