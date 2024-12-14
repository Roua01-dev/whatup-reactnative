import { View, Text } from 'react-native'
import React from 'react'
import { StatusBar } from 'expo-status-bar'

export default function List() {
  return (
    <View style={{flex:1}}>

       <StatusBar style="light"></StatusBar>
       
        <View style={{flex:1, backgroundColor: "#9cacd8",height:24}}></View>
    </View>
  )
}