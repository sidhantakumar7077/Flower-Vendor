import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, Modal, Alert, ScrollView, FlatList, TouchableHighlight, RefreshControl } from 'react-native'
import React, { useEffect, useState } from 'react'

const Index = () => {

    return (
        <View style={styles.container}>
            <Image
                style={{ width: 150, height: 150 }}
                source={require('../../assets/images/no-cooking.png')}
            />
            <View style={{ width: '80%', marginTop: 30, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#000', fontSize: 16, fontWeight: '500', letterSpacing: 0.4, textAlign: 'center' }}>Could not connect to the internet. Please check your network.</Text>
                <View style={{ marginTop: 25 }}>
                    <Text style={{ color: '#f51042', fontSize: 18, fontWeight: '500', letterSpacing: 0.4 }}>Try again</Text>
                </View>
            </View>
        </View>
    )
}

export default Index

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center'
    }
})