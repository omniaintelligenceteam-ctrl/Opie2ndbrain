import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Try to fetch real data from database (Supabase)
    let stats;
    
    try {
      // In a real implementation, you would connect to Supabase here
      // const { data, error } = await supabase
      //   .from('dashboard_analytics')
      //   .select('*')
      //   .single()
      // 
      // if (error) throw error
      // stats = data
      
      // For now, return mock data but simulate a real system
      stats = {
        activeWorkflows: Math.floor(Math.random() * 10) + 1,
        queuedWorkflows: Math.floor(Math.random() * 15) + 5,
        approvedContent: Math.floor(Math.random() * 50) + 20,
        queuedTopics: Math.floor(Math.random() * 20) + 8,
        avgAgentHealth: Math.round((0.8 + Math.random() * 0.2) * 100) / 100,
        scheduledPosts: Math.floor(Math.random() * 30) + 10,
        timestamp: new Date().toISOString()
      }
    } catch (dbError) {
      console.warn('Database connection failed, using fallback mock data:', dbError)
      
      // Fallback mock data if database connection fails
      stats = {
        activeWorkflows: 3,
        queuedWorkflows: 7,
        approvedContent: 24,
        queuedTopics: 12,
        avgAgentHealth: 0.87,
        scheduledPosts: 15,
        timestamp: new Date().toISOString(),
        fallback: true
      }
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    
    // Even if everything fails, return basic mock data so dashboard doesn't break
    return NextResponse.json({
      success: true,
      data: {
        activeWorkflows: 0,
        queuedWorkflows: 0,
        approvedContent: 0,
        queuedTopics: 0,
        avgAgentHealth: 0.0,
        scheduledPosts: 0,
        timestamp: new Date().toISOString(),
        error: true
      }
    })
  }
}