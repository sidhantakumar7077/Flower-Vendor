import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import React from 'react'

const Index = () => {
    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../../assets/images/Background.png')}
                style={{
                    flex: 1,
                    height: '100%',
                    width: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                <Image
                    source={require('../../assets/images/whitelogo.png')}
                    style={{ resizeMode: 'contain', height: 180, width: 180 }}
                />
            </ImageBackground>
        </View>
    )
}

export default Index

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#c80100',
        justifyContent: 'center',
        alignItems: 'center',
    },
})